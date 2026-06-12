## Architecture

El sistema de backup se implementa como un script TypeScript independiente que se ejecuta antes del inicio de los servidores. No forma parte del ciclo de vida del backend NestJS, sino que es un paso previo en la cadena de inicio.

## Components

### Script de Backup (`backend/scripts/backup-db.ts`)

Script Node.js/TypeScript que:

1. **Ubicación de la BD**: Lee `prisma/dev.db` (ruta relativa al proyecto)
2. **Directorio de backups**: `backups/` en la raíz del proyecto
3. **Naming convention**: `dev_YYYYMMDD_HHMMSS.db` — El timestamp en el nombre permite ordenamiento cronológico natural
4. **Rotación**: Se mantienen máximo 5 backups. Al crear uno nuevo, si hay más de 5, se eliminan los más antiguos (orden alfabético = cronológico por el formato de timestamp)
5. **Idempotencia**: Si la BD no existe aún (primera ejecución), se omite el backup sin errores

### Scripts de Inicio

Los tres scripts de inicio ejecutan el backup como paso [2/6]:

```
[1/6] Verificando base de datos...
[2/6] Creando backup de la base de datos...  ← NUEVO
[3/6] Verificando datos de seed...
[4/6] Iniciando Backend...
[5/6] Iniciando Frontend...
[6/6] Esperando...
```

## Data Flow

```
start-app.bat
  └─> cd backend && ts-node scripts/backup-db.ts
        ├─ Verifica que prisma/dev.db existe
        ├─ Crea directorio backups/ si no existe
        ├─ Copia prisma/dev.db → backups/dev_YYYYMMDD_HHMMSS.db
        ├─ Lista todos los backups existentes
        ├─ Si hay > 5, elimina los más antiguos
        └─ Muestra resumen (cantidad y rango de archivos)
```

## Decisions

- **Formato de nombre con timestamp**: Permite ordenamiento natural y identificación visual de la fecha/hora de cada backup
- **Máximo 5 backups**: Balance entre historial y espacio en disco. La BD SQLite típicamente pesa ~120KB, por lo que 5 backups ocupan ~600KB
- **Ejecución al inicio**: Garantiza que siempre se tenga un respaldo antes de que los servidores empiecen a modificar datos
- **Exclusión de git**: Los backups son datos locales que no deben versionarse