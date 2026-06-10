# Implementation Plan

Fix the NestJS backend application that is failing to compile and run properly. The system is a property management platform (COA Alquileres) with Next.js frontend, NestJS backend, and Prisma ORM with SQLite.

The main issues are: **two conflicting Prisma schema files** (root vs backend), **missing Prisma model relations in the backend schema**, **missing `descripcion` field on DistribucionCobro model in root schema**, and **missing `Usuario` model in root schema**. The schemas have diverged and need reconciling. Additionally, `usuarios.module.ts` does not import `AuthModule` even though it likely needs it for guards.

[Schema]
Reconcile the two Prisma schemas into a single source of truth, consolidating all models and relations.

**Root Schema (`g:\EDU\prisma\schema.prisma`):**
- Has `CuentaCorriente` with FK relations (`propietario Propietario @relation(...)`, `inmueble Inmueble? @relation(...)`)
- Has `cuentaCorriente CuentaCorriente[]` on both `Inmueble` and `Propietario` models
- Missing: `Usuario` model
- Missing: `descripcion String?` on `DistribucionCobro`
- Has `CuentaCorriente.tipoMovimiento` enum values: `CREDITO, DEBITO, DISTRIBUCION, GASTO, AJUSTE`
- Has `LogAuditoria` model

**Backend Schema (`g:\EDU\backend\prisma\schema.prisma`):**
- `CuentaCorriente` has NO FK relations (no `@relation` decorators on propietarioId/inmuebleId)
- Missing: `cuentaCorriente` relation on `Inmueble` and `Propietario` models
- Has: `Usuario` model
- Has: `descripcion String?` on `DistribucionCobro`
- Has `CuentaCorriente.tipoMovimiento` enum values: `CREDITO, DEBITO, GASTO, DISTRIBUCION, AJUSTE_POSITIVO, AJUSTE_NEGATIVO`
- Has `LogAuditoria` model
- Has `FacturaElectronica` model (also in root)
- `CuentaCorriente` has no `@@index([tipoMovimiento])` index

**Target Schema (consolidated):**
Take the root schema as base, add:
- `Usuario` model from backend schema
- `descripcion String?` on `DistribucionCobro` from backend schema
- Expanded `tipoMovimiento` values from backend schema: `CREDITO, DEBITO, GASTO, DISTRIBUCION, AJUSTE_POSITIVO, AJUSTE_NEGATIVO`
- `@@index([tipoMovimiento])` on `CuentaCorriente` from backend schema

Use the **backend** schema as the single source of truth (since all backend code references it), enriched with FK relations from the root schema.

[Files]
Modify `g:\EDU\backend\prisma\schema.prisma` to add FK relations on `CuentaCorriente` model and `cuentaCorriente` relations on `Propietario` and `Inmueble` models.
Update `g:\EDU\prisma\schema.prisma` to match the backend schema (add Usuario, fix DistribucionCobro, sync CuentaCorriente).
Regenerate Prisma client from the synced schema.

**Files to modify:**
- `g:\EDU\backend\prisma\schema.prisma` - Add FK relations to CuentaCorriente, add cuentaCorriente[] to Inmueble and Propietario
- `g:\EDU\prisma\schema.prisma` - Add Usuario model, add descripcion to DistribucionCobro, sync CuentaCorriente tipoMovimiento values, add @@index([tipoMovimiento])

**Files unchanged:**
- All .ts source files appear structurally correct for NestJS

[Functions]
No new functions needed. The issue is schema/relation integrity, not logic.

[Classes]
**CuentaCorriente (in both schemas):**
- Add: `propietario Propietario @relation(fields: [propietarioId], references: [id], onDelete: Cascade)`
- Add: `inmueble Inmueble? @relation(fields: [inmuebleId], references: [id], onDelete: Cascade)`
- Update: `tipoMovimiento` comment to include `AJUSTE_POSITIVO, AJUSTE_NEGATIVO`
- Add: `@@index([tipoMovimiento])`

**Propietario (in backend schema):**
- Add: `cuentaCorriente CuentaCorriente[]`

**Inmueble (in backend schema):**
- Add: `cuentaCorriente CuentaCorriente[]`

**DistribucionCobro (in root schema):**
- Add: `descripcion String?`

**Root schema (`g:\EDU\prisma\schema.prisma`):**
- Add `Usuario` model (copy from backend schema)

[Dependencies]
No new npm packages needed. Only Prisma client regeneration.

[Testing]
After applying the schema changes:
1. Run `prisma generate` from backend directory
2. Run `prisma db push` to sync database
3. Run `nest build` or `tsc --noEmit` to verify compilation
4. Start the server and verify API endpoints respond

[Implementation Order]
1. Update `g:\EDU\backend\prisma\schema.prisma` with FK relations and missing relations
2. Update `g:\EDU\prisma\schema.prisma` to match (Usuario model, descripcion field, CuentaCorriente tipoMovimiento)
3. Regenerate Prisma client: `cd g:\EDU\backend && npx prisma generate`
4. Push schema to database: `cd g:\EDU\backend && npx prisma db push`
5. Verify TypeScript compilation: `cd g:\EDU\backend && npx tsc --noEmit`
6. Start backend server and test