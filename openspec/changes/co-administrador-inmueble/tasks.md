## 1. Modelo de Datos y Migraciones

- [ ] 1.1 Crear entidad y migración para tabla intermedia inmueble_propietarios
- [ ] 1.2 Agregar campo porcentaje, fecha_alta y activo a la relación
- [ ] 1.3 Crear migración de datos: copiar propietarios existentes con 100%
- [ ] 1.4 Implementar constraints y validaciones a nivel base de datos

## 2. Sistema de Seguridad y Roles

- [ ] 2.1 Crear nuevo rol ROLE_PROPIETARIO en el sistema RBAC
- [ ] 2.2 Implementar filtro de acceso por propietario en todas las consultas
- [ ] 2.3 Definir permisos específicos para el rol propietario
- [ ] 2.4 Configurar firewall y rutas accesibles para propietarios

## 3. Core Business Logic

- [ ] 3.1 Implementar servicio de gestión de copropietarios
- [ ] 3.2 Desarrollar algoritmo de distribución proporcional de ingresos
- [ ] 3.3 Implementar lógica de deducción automática de gastos
- [ ] 3.4 Crear sistema de trazabilidad y auditoría de transacciones

## 4. Integración Facturación Electrónica

- [ ] 4.1 Configurar cliente API para servicio Arca AFIP
- [ ] 4.2 Implementar generación automática de facturas Monotributo
- [ ] 4.3 Sistema de cola y reintentos para llamadas externas
- [ ] 4.4 Registro de estado y errores de facturación

## 5. Panel de Propietarios

- [ ] 5.1 Crear interfaz de login y acceso exclusivo para propietarios
- [ ] 5.2 Desarrollar dashboard principal con resumen de inmuebles
- [ ] 5.3 Implementar vista de detalle de inmueble e inquilino
- [ ] 5.4 Historial completo de movimientos y transacciones

## 6. Pruebas y Despliegue

- [ ] 6.1 Tests unitarios para lógica de distribución y cálculos
- [ ] 6.2 Tests de integración con API de facturación
- [ ] 6.3 Tests de seguridad y permisos por rol
- [ ] 6.4 Plan de despliegue gradual y rollback