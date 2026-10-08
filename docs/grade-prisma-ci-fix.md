# Prisma Client generation in a fresh checkout

CI initially failed in QA with `Cannot find module '../generated/client'`.
The `course`, `gradeItem`, `$transaction`, `$connect` and `$disconnect` errors
were downstream symptoms of the missing generated Prisma Client.
Local checks previously passed after an explicit `prisma generate` command.

Backend scripts now generate Prisma Client before lint, typecheck, tests, build
and development startup. `start:prod` and `prisma:deploy` are unchanged.
The generator runs the locally installed Prisma CLI with Node and stops the
next command if generation fails. It is independent of pnpm pre/post hooks.
Version 2 resolves the executable from the installed package's `bin` metadata
via the filesystem. It does not use `require.resolve('prisma')`: that package
root export resolved to a missing build/types.js on the team machine.

`prisma.config.ts` requires DATABASE_URL. When the process environment has no
value, a build-only placeholder is supplied to the generation child process.
It is not written to .env or inherited by the API/Jest process afterwards.
Explicitly provided environment values are preserved.
The command does not run migrations or access production data.

No dependencies, lockfile, migrations, auth, CI workflows or generated-source
tracking rules are changed. Generated client files remain ignored.

## Verify on the team machine

Run `corepack pnpm install --frozen-lockfile` and
`./standards/scripts/run-all-checks.sh .` from the repo root. Generation should
appear before the backend checks; then verify lint, typecheck, tests and build.
Push this fix to the existing PR branch and check the new CI run.

Installer and CLI-process fixtures were checked in the preparation environment.
Full checks with Prisma 7.9.1 and the application dependencies must be confirmed
on the team machine and GitHub Actions; this document does not claim CI passed.
