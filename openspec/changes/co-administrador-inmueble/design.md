## Context

El sistema actualmente solo soporta relación 1:1 entre inmueble y propietario. No existe acceso dedicado para propietarios, toda la gestión se realiza exclusivamente por personal de la inmobiliaria.

Este cambio agrega una capa completa de multi-propietario manteniendo compatibilidad 100% con el sistema existente, sin requerir migraciones destructivas y sin afectar el funcionamiento actual para la inmobiliaria.

## Goals / Non-Goals

**Goals:**
- Implementar relación muchos a muchos entre Inmuebles y Propietarios con porcentaje de participación
- Crear rol de usuario Propietario con acceso limitado solo a sus bienes
- Desarrollar algoritmo de distribución automática de ingresos con deducción de gastos
- Integrar generación de facturas electrónicas Monotributo Arca/AFIP
- Mantener trazabilidad completa y auditoría de todas las operaciones
- Cero cambios rompedores en el sistema existente

**Non-Goals:**
- No se modifica el flujo de trabajo interno de la inmobiliaria
- No se reemplaza el sistema de cobros existente, solo se extiende
- No se implementa transferencias bancarias automáticas, solo calculo y visualización
- No hay cambios en el módulo de contratos de alquiler existente

## Stack Tecnológico

✅ **Frontend**: Next.js 15 App Router
✅ **Backend**: NestJS 11 con arquitectura modular
✅ **Base de Datos**: MySQL 8.0
✅ **ORM**: Prisma
✅ **Autenticación**: Auth.js / NextAuth

## Decisions

0. **Stack Tecnológico**: Se implementa el sistema sobre arquitectura fullstack moderna:
   - Frontend: Next.js 15 App Router con Server Components
   - Backend API: NestJS 11
   - Base de Datos: MySQL 8.0 con tablas relacionales
   *Rationale*: Stack estandar, bien soportado, excelente para proyectos de administración inmobiliaria con requisitos de escalabilidad.

1. **Modelo de Datos**: Se crea tabla intermedia `inmueble_propietarios` con campos `inmueble_id`, `propietario_id`, `porcentaje`, `fecha_alta`, `activo`. No se modifica la tabla inmuebles existente.
   
   *Rationale*: Permite mantener retrocompatibilidad total, es la forma normalizada standard para relaciones muchos a muchos. Perfectamente soportado en MySQL.

2. **Sistema de Permisos**: Se implementa RBAC extendido con nuevo rol `ROLE_PROPIETARIO`. Este rol solo tendrá acceso a endpoints y vistas explicitamente autorizadas.

   *Rationale*: Aprovecha el sistema de guards nativo de NestJS, implementación nativa y segura.

3. **Distribución de Ingresos**: Se calcula por cada operación individualmente, no por cierre mensual. Cada cobro y cada gasto se distribuye en el momento de su registro.

   *Rationale*: Mayor transparencia para los propietarios, permite trazabilidad exacta y evita errores de calculo acumulado.

4. **Facturación Electrónica**: Integración mediante API REST oficial de Arca, generación automática al registrar cobro de alquiler.

   *Rationale*: Cumplimiento normativo obligatorio en Argentina para contratos de alquiler desde 2025. Se implementara como servicio independiente en NestJS.

## Risks / Trade-offs

- [Redondeo en distribución proporcional] → Se utiliza redondeo bancario (HALF_EVEN) y se verifica que la suma de porcentajes siempre sea exactamente 100%
- [Acceso concurrente de múltiples propietarios] → Implementación de cache por propietario y limitación de tasa de consultas
- [Dependencia de servicio externo de facturación] → Sistema de cola con reintentos y registro de fallos para procesamiento asincrónico

## Migration Plan

1. Agregar tablas y campos nuevos sin tocar estructuras existentes
2. Desplegar código sin activar funcionalidad
3. Migrar datos existentes: propietarios actuales se copian a la nueva tabla con 100%
4. Activar funcionalidad gradualmente por inmueble
5. Habilitar acceso a propietarios por invitación

Rollback: Desactivar flag de funcionalidad, todo el sistema vuelve al comportamiento original inmediatamente.