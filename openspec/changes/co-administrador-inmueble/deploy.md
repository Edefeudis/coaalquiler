# Plan de Despliegue Gradual y Rollback

## Fases de Despliegue

### Fase 1: Base de Datos (Sin impacto)
1. Ejecutar migración de schema Prisma (`prisma migrate deploy`)
2. Ejecutar script `migrar-propietarios-100.ts` para poblar tabla intermedia
3. Verificar que todos los inmuebles sumen 100% en porcentajes

### Fase 2: Backend (Código inactivo)
1. Desplegar nuevo backend con todos los módulos
2. Endpoints nuevos disponibles pero no consumidos por frontend legacy
3. Validar que login y auth existentes no se vean afectados

### Fase 3: Activación por inmueble
1. Habilitar flag `multi_propietario` por inmueble individual
2. Probar distribución de cobros y gastos en inmuebles de prueba
3. Verificar facturación electrónica con Arca (ambiente testing)

### Fase 4: Panel de propietarios
1. Desplegar frontend Next.js en subdominio o ruta `/propietarios`
2. Enviar invitaciones por email a propietarios con link de acceso
3. Monitorear logs de auditoría en tiempo real

### Fase 5: Producción completa
1. Habilitar para todos los inmuebles
2. Capacitar al personal de la inmobiliaria en nuevos endpoints
3. Configurar alertas para errores de facturación y reintentos automáticos

## Rollback

- **Inmediato**: Desactivar flag `multi_propietario` a nivel global vuelve al sistema original
- **DB**: Las tablas nuevas no afectan datos existentes; no hay migraciones destructivas
- **Código**: Frontend legacy sigue funcionando; endpoints nuevos pueden ocultarse vía feature flags
- **Facturación**: Facturas en estado PENDIENTE/ERROR pueden cancelarse sin impacto fiscal

## Checklist Pre-Deploy

- [ ] Tests unitarios pasan: `npm run test`
- [ ] Tests de seguridad pasan: `npm run test:security`
- [ ] Migración DB exitosa en staging
- [ ] Pruebas con API Arca en ambiente testing
- [ ] Backup de base de datos antes del deploy
