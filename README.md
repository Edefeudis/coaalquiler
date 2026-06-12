# CoaAlquiler

Sistema de gestión de alquileres inmobiliarios. Plataforma web para administrar propiedades, propietarios, cobros de alquiler, gastos, distribuciones y facturación electrónica.

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend** | [NestJS](https://nestjs.com/) (TypeScript) |
| **Frontend** | [Next.js](https://nextjs.org/) (React) |
| **Base de datos** | [SQLite](https://www.sqlite.org/) via [Prisma ORM](https://www.prisma.io/) |
| **Estilos** | [Tailwind CSS](https://tailwindcss.com/) |
| **Puerto Backend** | 3000 |
| **Puerto Frontend** | 3001 |

## Estructura del Proyecto

```
CoaAlquiler/
├── backend/                  # API NestJS (puerto 3000)
│   ├── src/                  # Código fuente del backend
│   ├── prisma/               # Configuración de Prisma
│   ├── scripts/              # Scripts utilitarios (backup, seed, etc.)
│   └── package.json
├── frontend/                 # App Next.js (puerto 3001)
│   ├── app/                  # Páginas y rutas
│   ├── components/           # Componentes React
│   ├── lib/                  # Utilidades y helpers
│   └── package.json
├── prisma/                   # Schema de Prisma y base de datos
│   └── schema.prisma
├── backups/                  # Backups automáticos de la BD (excluido de git)
├── openspec/                 # Especificaciones y cambios del proyecto
├── start-app.bat             # Iniciar app (desarrollo)
├── start-app-prod.bat        # Iniciar app (producción)
├── start-app-simple.bat      # Iniciar app (simplificado)
├── stop-app.bat              # Detener app
├── restart-app.bat           # Reiniciar app
└── package.json
```

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18+)
- npm
- Windows 10+ (scripts `.bat`)

## Instalación

```bash
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. Instalar dependencias del frontend
cd ../frontend
npm install

# 3. Volver a la raíz
cd ..
```

## Inicio de la Aplicación

### Modo Desarrollo (recomendado)

Doble clic en `start-app-simple.bat` o ejecutar:

```bash
start-app-simple.bat
```

### Modo Producción

Doble clic en `start-app-prod.bat` o ejecutar:

```bash
start-app-prod.bat
```

> En modo producción, el frontend se compila una sola vez y se sirve sin recompilar en cada acceso.

### Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `start-app-simple.bat` | Inicia backend y frontend (recomendado) |
| `start-app.bat` | Inicia con mensajes detallados |
| `start-app-prod.bat` | Inicia en modo producción (compila frontend) |
| `stop-app.bat` | Detiene todos los procesos Node.js |
| `restart-app.bat` | Reinicia la aplicación |

## URLs de la Aplicación

- **Backend API**: http://localhost:3000
- **Frontend Web**: http://localhost:3001

## Credenciales de Prueba

- **Email**: `propietario@test.com`
- **Contraseña**: No se requiere (solo email)

## Base de Datos

La aplicación utiliza **SQLite** como base de datos, gestionada a través de **Prisma ORM**.

- **Ubicación**: `prisma/dev.db`
- **Schema**: `prisma/schema.prisma`

### Modelos Principales

| Modelo | Descripción |
|--------|-------------|
| `Inmueble` | Propiedades inmobiliarias |
| `Propietario` | Dueños de propiedades |
| `Usuario` | Usuarios del sistema (ADMIN, EMPLEADO) |
| `CobroAlquiler` | Cobros de alquiler por período |
| `DistribucionCobro` | Distribución de cobros entre propietarios |
| `GastoInmueble` | Gastos asociados a propiedades |
| `CuentaCorriente` | Cuenta corriente de propietarios |
| `FacturaElectronica` | Facturación electrónica (ARCA) |
| `LogAuditoria` | Registro de auditoría |

### Backup Automático

Al iniciar la aplicación, se crea automáticamente un backup de la base de datos con rotación de 5 versiones:

- **Ubicación**: `backups/`
- **Formato**: `dev_YYYYMMDD_HHMMSS.db`
- **Máximo**: 5 backups (los más antiguos se eliminan automáticamente)
- **Excluido de git**: El directorio `backups/` está en `.gitignore`

Para ejecutar un backup manual:

```bash
cd backend
npm exec ts-node scripts/backup-db.ts
```

### Comandos de Prisma

```bash
# Generar cliente Prisma
npm run prisma:generate

# Aplicar esquema a la BD
npm run prisma:push

# Ejecutar migraciones
npm run prisma:migrate

# Abrir Prisma Studio (UI para la BD)
npx prisma studio
```

## Funcionalidades

- **Gestión de propiedades**: Alta, baja y modificación de inmuebles
- **Propietarios**: Administración de propietarios y su relación con propiedades
- **Cobros de alquiler**: Registro de cobros por período con cálculo automático de montos
- **Distribución de cobros**: Distribución automática entre propietarios según porcentajes
- **Gastos**: Registro de gastos asociados a propiedades
- **Cuenta corriente**: Seguimiento de créditos y débitos por propietario
- **Facturación electrónica**: Integración con ARCA para emisión de facturas
- **Auditoría**: Registro de todas las operaciones en el sistema
- **Backup automático**: Respaldo de la BD al inicio con rotación de 5 versiones

## Solución de Problemas

### Conflictos de puerto

Si ves errores de puerto ocupados:

```bash
stop-app.bat
# Esperar unos segundos
start-app-simple.bat
```

### Recrear la base de datos

```bash
# 1. Detener la app
stop-app.bat

# 2. Eliminar la BD
del prisma\dev.db

# 3. Regenerar y aplicar esquema
npm run prisma:generate
npm run prisma:push

# 4. Sembrar datos de prueba
cd backend
npm exec ts-node scripts/seed-admin.ts
cd ..

# 5. Iniciar
start-app.bat
```

### Errores de TypeScript

Si ves un warning sobre `baseUrl` deprecado, se resuelve con `ignoreDeprecations: "6.0"` en `backend/tsconfig.json`.

## Licencia

Proyecto privado.