# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoaAlquiler - Property rental management system for co-ownership properties (copropietarios). The system manages rental income distribution, expenses, and electronic invoicing for property owners.

## Commands

### Run the Application
```bash
# Start both frontend and backend (recommended)
start-app-simple.bat

# Alternative with verbose output
start-app.bat

# Restart application
restart-app.bat

# Stop all Node.js processes
stop-app.bat
```

### Backend (NestJS - port 3000)
```bash
cd backend
npm run start:dev    # Watch mode with hot reload
npm run build        # Build for production
npm run test         # Run Jest tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
```

### Frontend (Next.js - port 3001)
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Run ESLint
```

### Database
```bash
cd backend
npm exec ts-node scripts/seed.ts              # Seed test data
npm exec ts-node scripts/seed-admin.ts        # Create admin users
npm run prisma:migrate                        # Apply migrations
```

## URLs
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Admin Panel: http://localhost:3001/admin

## Test Credentials
- **Admin**: admin@coaalquiler.com / admin123
- **Empleado**: empleado@coaalquiler.com / empleado123
- **Propietario**: propietario@test.com (email only, no password)

## Architecture

```
c:\edu\
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # JWT authentication (owners & admins)
│   │   ├── propietarios/   # Property owners management
│   │   ├── inmuebles/      # Properties management
│   │   ├── cobros/         # Rental income & distribution
│   │   ├── gastos/         # Property expenses
│   │   ├── facturacion/    # Electronic invoicing (ARCA)
│   │   ├── auditoria/      # Audit logging
│   │   └── prisma/         # Prisma module
│   └── prisma/schema.prisma  # Database schema
├── frontend/               # Next.js 15 App Router
│   ├── app/
│   │   ├── admin/          # Admin panel routes
│   │   ├── dashboard/      # Propietario dashboard
│   │   └── inmueble/[id]/  # Property detail views
│   └── components/         # React components
└── prisma/                 # Root Prisma config
```

### Data Model

- **Inmueble** → Property (linked to Propietarios via InmueblePropietario)
- **Propietario** → Property owner with percentage ownership
- **CobroAlquiler** → Rental payment with distribution to owners
- **DistribucionCobro** → Per-owner allocation from a CobroAlquiler
- **GastoInmueble** → Property expenses
- **FacturaElectronica** → ARCA e-invoicing status
- **LogAuditoria** → Audit trail
- **Usuario** → Admin/empleado users with roles (ADMIN, EMPLEADO)

### Authentication Flow

1. **Propietarios** (owners): Email-only login at `/api/auth/login`
2. **Administrators**: Email + password login at `/api/auth/admin/login`

Both use JWT Bearer tokens. Token stored in localStorage on frontend.

## Tech Stack

- **Backend**: NestJS 11, Prisma 5, SQLite, JWT (passport-jwt), bcrypt
- **Frontend**: Next.js 15, React 18, TailwindCSS, lucide-react
- **Database**: SQLite with Prisma ORM
- **Testing**: Jest + ts-jest

## Key Conventions

- Decimal fields used for monetary values
- Timestamps on all models (createdAt, updatedAt where applicable)
- Soft delete via `activo` boolean on join tables
- Audit logging via LogAuditoria model for tracking operations
- E-invoicing uses AFIP/ARCA patterns (CAE, estado tracking)