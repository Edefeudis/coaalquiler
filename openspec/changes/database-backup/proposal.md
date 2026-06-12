## Why

La aplicación no cuenta con un mecanismo de respaldo automático de la base de datos. En caso de corrupción, error humano o cualquier incidente que comprometa la integridad de los datos, no existe forma de recuperar la información perdida. Un backup automático al inicio de la aplicación garantiza que siempre se disponga de versiones recientes de la BD.

## What Changes

Implementar un sistema de backup automático de la base de datos SQLite que se ejecuta al arrancar la aplicación, con rotación de 5 versiones para no saturar el almacenamiento.

## Capabilities

### New Capabilities

- `database-backup`: Sistema automático de respaldo de la base de datos SQLite con rotación de versiones. Se ejecuta al inicio de la aplicación antes de iniciar los servidores.

### Modified Capabilities

- `app-startup`: Los scripts de inicio (`start-app.bat`, `start-app-prod.bat`, `start-app-simple.bat`) ahora ejecutan un paso adicional de backup antes de iniciar los servidores.

## Impact

- Nuevo archivo: `backend/scripts/backup-db.ts` — Script de backup con rotación
- Nuevo directorio: `backups/` — Almacenamiento de backups (excluido de git)
- Modificados: `start-app.bat`, `start-app-prod.bat`, `start-app-simple.bat` — Agregado paso de backup
- Modificado: `.gitignore` — Agregado `backups/`
- Modificado: `backend/tsconfig.json` — Agregado `ignoreDeprecations: "6.0"` para compatibilidad TypeScript 6+