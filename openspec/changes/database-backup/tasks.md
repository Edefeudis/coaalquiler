## 1. Script de Backup

- [x] 1.1 Crear `backend/scripts/backup-db.ts` con lógica de copia de la BD
- [x] 1.2 Implementar rotación de 5 versiones con eliminación de antiguos
- [x] 1.3 Agregar naming convention con timestamp `dev_YYYYMMDD_HHMMSS.db`
- [x] 1.4 Manejar caso donde la BD no existe aún (primera ejecución)

## 2. Integración en Scripts de Inicio

- [x] 2.1 Agregar paso de backup en `start-app.bat` (paso 2/6)
- [x] 2.2 Agregar paso de backup en `start-app-prod.bat` (paso 2/6)
- [x] 2.3 Agregar paso de backup en `start-app-simple.bat` (paso 2/6)

## 3. Configuración del Proyecto

- [x] 3.1 Agregar `backups/` al `.gitignore`
- [x] 3.2 Agregar `ignoreDeprecations: "6.0"` en `backend/tsconfig.json`

## 4. Verificación

- [x] 4.1 Probar ejecución manual del script de backup
- [x] 4.2 Verificar creación del directorio `backups/`
- [x] 4.3 Verificar rotación: crear 6 backups y confirmar que se elimina el más viejo
- [x] 4.4 Verificar que el backup se ejecuta correctamente desde los scripts .bat

## 5. Documentación

- [x] 5.1 Crear propuesta OpenSpec (`proposal.md`)
- [x] 5.2 Crear diseño OpenSpec (`design.md`)
- [x] 5.3 Crear tareas OpenSpec (`tasks.md`)