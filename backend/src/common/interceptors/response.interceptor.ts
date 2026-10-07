import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ResponseWithMeta {
  data: unknown;
  meta: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor
  implements NestInterceptor
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          const response = data as ResponseWithMeta;

          return {
            success: true,
            data: response.data,
            meta: response.meta,
          };
        }

        return {
          success: true,
          data,
          meta: {},
        };
      }),
    );
  }
}