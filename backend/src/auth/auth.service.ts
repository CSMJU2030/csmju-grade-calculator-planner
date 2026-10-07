import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
} from 'jose';
import type { JWK, KeyLike } from 'jose';

import type { AuthUser, CoreRole } from './auth.types';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE } from './role-mapping';

type VerificationKey = KeyLike | Uint8Array;

@Injectable()
export class AuthService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly subsystemId: string;
  private readonly jwksUrl: URL;

  private readonly cacheTtlMs = 600_000;
  private readonly refreshIntervalMs = 30_000;
  private readonly requestTimeoutMs = 5_000;
  private readonly clockToleranceSec = 60;

  private keys = new Map<string, JWK>();
  private importedKeys =
    new Map<string, Promise<VerificationKey>>();

  private fetchedAt = 0;
  private lastRefreshAttemptAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor() {
    this.issuer =
      process.env.CORE_HUB_ISSUER ?? 'core-hub';
    this.audience =
      process.env.CORE_HUB_AUDIENCE ?? 'csmju2030';

    const subsystemId = process.env.SUBSYSTEM_ID?.trim();

    if (!subsystemId) {
      throw new Error('SUBSYSTEM_ID is required');
    }

    this.subsystemId = subsystemId;

    const explicitJwksUrl =
      process.env.CORE_HUB_JWKS_URL?.trim();
    const coreHubUrl =
      process.env.CORE_HUB_URL?.trim().replace(/\/+$/, '');

    if (!explicitJwksUrl && !coreHubUrl) {
      throw new Error(
        'CORE_HUB_JWKS_URL or CORE_HUB_URL is required',
      );
    }

    this.jwksUrl = new URL(
      explicitJwksUrl ??
        `${coreHubUrl}/api/v1/.well-known/jwks.json`,
    );

    if (!['http:', 'https:'].includes(this.jwksUrl.protocol)) {
      throw new Error('Invalid Core Hub JWKS URL protocol');
    }
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      if (typeof token !== 'string' || !token.trim()) {
        throw new UnauthorizedException('Missing access token');
      }

      const header = decodeProtectedHeader(token);

      if (header.alg !== 'RS256') {
        throw new UnauthorizedException('Unsupported algorithm');
      }

      if (
        typeof header.kid !== 'string' ||
        !header.kid.trim()
      ) {
        throw new UnauthorizedException('Missing kid');
      }

      const key = await this.getKey(header.kid);

      const { payload } = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: this.clockToleranceSec,
        requiredClaims: ['sub', 'iat', 'exp'],
      });

      if (
        typeof payload.sub !== 'string' ||
        !payload.sub.trim() ||
        payload.sub.length > 64
      ) {
        throw new UnauthorizedException('Invalid subject');
      }

      if (
        typeof payload.iat !== 'number' ||
        !Number.isFinite(payload.iat) ||
        typeof payload.exp !== 'number' ||
        !Number.isFinite(payload.exp)
      ) {
        throw new UnauthorizedException('Invalid token timestamps');
      }

      const now = Math.floor(Date.now() / 1000);
      const lifetime = payload.exp - payload.iat;

      if (
        lifetime <= 0 ||
        lifetime > 900 + this.clockToleranceSec ||
        payload.iat > now + this.clockToleranceSec
      ) {
        throw new UnauthorizedException('Invalid token lifetime');
      }

      if (
        payload.azp !== undefined &&
        payload.azp !== this.subsystemId
      ) {
        throw new UnauthorizedException(
          'Token was issued for another subsystem',
        );
      }

      if (
        typeof payload.role !== 'string' ||
        !payload.role.trim()
      ) {
        throw new UnauthorizedException('Missing role');
      }

      if (
        !Object.hasOwn(
          CORE_ROLE_TO_SUBSYSTEM_ROLE,
          payload.role,
        )
      ) {
        throw new ForbiddenException(
          'Your role has no access to this subsystem',
        );
      }

      return {
        sub: payload.sub,
        email:
          typeof payload.email === 'string'
            ? payload.email
            : '',
        role: payload.role as CoreRole,
        sid:
          typeof payload.sid === 'string'
            ? payload.sid
            : '',
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // ไม่แสดง token หรือรายละเอียดที่อาจมีข้อมูลลับ
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async getKey(kid: string): Promise<VerificationKey> {
    const cacheExpired =
      Date.now() - this.fetchedAt >= this.cacheTtlMs;

    if (cacheExpired || !this.keys.has(kid)) {
      await this.refreshKeys();
    }

    const jwk = this.keys.get(kid);

    if (!jwk) {
      throw new UnauthorizedException('Unknown signing key');
    }

    let imported = this.importedKeys.get(kid);

    if (!imported) {
      imported = importJWK(jwk, 'RS256');
      this.importedKeys.set(kid, imported);
    }

    return imported;
  }

  private async refreshKeys(): Promise<void> {
    if (this.refreshing) {
      return this.refreshing;
    }

    if (
      Date.now() - this.lastRefreshAttemptAt <
      this.refreshIntervalMs
    ) {
      return;
    }

    this.lastRefreshAttemptAt = Date.now();

    this.refreshing = this.downloadKeys().finally(() => {
      this.refreshing = null;
    });

    return this.refreshing;
  }

  private async downloadKeys(): Promise<void> {
    try {
      const response = await fetch(this.jwksUrl, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
        redirect: 'error',
      });

      if (!response.ok) {
        throw new Error('JWKS request failed');
      }

      const body: unknown = await response.json();

      if (
        !body ||
        typeof body !== 'object' ||
        !('keys' in body) ||
        !Array.isArray(body.keys)
      ) {
        throw new Error('Invalid JWKS document');
      }

      const nextKeys = new Map<string, JWK>();

      for (const candidate of body.keys) {
        if (!candidate || typeof candidate !== 'object') {
          continue;
        }

        const jwk = candidate as JWK;

        if (
          jwk.kty !== 'RSA' ||
          typeof jwk.kid !== 'string' ||
          !jwk.kid ||
          typeof jwk.n !== 'string' ||
          typeof jwk.e !== 'string' ||
          jwk.d !== undefined ||
          (jwk.use !== undefined && jwk.use !== 'sig') ||
          (jwk.alg !== undefined && jwk.alg !== 'RS256') ||
          (jwk.key_ops !== undefined &&
            !jwk.key_ops.includes('verify'))
        ) {
          continue;
        }

        nextKeys.set(jwk.kid, jwk);
      }

      if (nextKeys.size === 0) {
        throw new Error('No usable signing keys');
      }

      this.keys = nextKeys;
      this.importedKeys.clear();
      this.fetchedAt = Date.now();
    } catch {
      // ใช้กุญแจเดิมต่อเมื่อ Core Hub ล่มชั่วคราว
      if (this.keys.size === 0) {
        throw new UnauthorizedException(
          'Core Hub signing keys are unavailable',
        );
      }
    }
  }
}