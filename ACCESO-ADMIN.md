# Acceso al Panel de Administración

## ¿Cómo entrar al panel de administrador?

### 1. Desde la página principal
1. Ve a: http://localhost:3001
2. Haz clic en el enlace "Acceso al panel de administración →" en la parte inferior de la página de login
3. Esto te llevará a: http://localhost:3001/admin

### 2. Acceso directo
Puedes acceder directamente a: http://localhost:3001/admin

## Credenciales de acceso

### Administrador
- **Email**: `admin@coaalquiler.com`
- **Contraseña**: `admin123`
- **Rol**: ADMIN

### Empleado
- **Email**: `empleado@coaalquiler.com`
- **Contraseña**: `empleado123`
- **Rol**: EMPLEADO

## Funcionalidades del panel de administración

Una vez que ingreses con tus credenciales, tendrás acceso al dashboard con las siguientes opciones:

### 📊 Dashboard Principal
- Vista general del sistema
- Información del usuario conectado
- Acceso rápido a todas las funcionalidades
- **Estado**: ✅ Disponible

### 👥 Propietarios
- Gestión de propietarios
- Crear nuevos propietarios
- Ver lista de propietarios
- Gestión de copropietarios
- Ver inmuebles de propietarios
- **Estado**: ✅ Funcionalidades básicas disponibles

### 🏠 Inmuebles
- Administración de propiedades
- Ver detalles de inmuebles
- Gestionar relaciones propietario-inmueble
- **Estado**: ✅ Gestión a través de Propietarios

### 💰 Cobros
- Registro de cobros de alquiler
- Distribución de cobros entre propietarios
- Ver historial de cobros
- Crear nuevos cobros
- **Estado**: ✅ Funcionalidades disponibles

### 📋 Gastos
- Control de gastos por inmueble
- Registrar nuevos gastos
- Ver historial de gastos
- Eliminar gastos
- **Estado**: ✅ Funcionalidades disponibles

### 📄 Facturación
- Generación de facturas electrónicas
- Estado de facturas
- Reintentar facturas fallidas
- **Estado**: ✅ Funcionalidades disponibles

### 📝 Auditoría
- Historial de cambios
- Registro de operaciones
- Bitácora de actividades
- **Estado**: ⚠️ Modelo existe pero controlador no implementado

## Diferencias entre roles

### ADMIN (Administrador)
- Acceso completo a todas las funcionalidades
- Puede crear y eliminar usuarios
- Gestión completa del sistema

### EMPLEADO (Empleado)
- Acceso limitado a operaciones diarias
- Puede registrar cobros y gastos
- No puede gestionar usuarios

## Seguridad

- Las contraseñas están encriptadas con bcrypt
- Los tokens JWT expiran automáticamente
- Sesiones guardadas en localStorage
- Cierre de sesión disponible en el dashboard

## Notas importantes

1. **Solo para administradores y empleados**: El panel de administración es diferente al login de propietarios
2. **Contraseña requerida**: A diferencia del login de propietarios, aquí necesitas email y contraseña
3. **Roles específicos**: Los roles determinan qué funcionalidades puedes acceder
4. **Seguridad**: Mantén tus credenciales seguras y no las compartas
5. **Estado de desarrollo**: La mayoría de las funcionalidades del backend están implementadas y disponibles en el frontend

## Estado de las rutas

### Rutas disponibles (no dan 404)
- ✅ `/admin` - Login de administración
- ✅ `/admin/dashboard` - Dashboard principal
- ✅ `/admin/propietarios` - Gestión de propietarios (funcionalidades básicas)
- ✅ `/admin/inmuebles` - Gestión de inmuebles (a través de propietarios)
- ✅ `/admin/cobros` - Gestión de cobros (funcionalidades disponibles)
- ✅ `/admin/gastos` - Gestión de gastos (funcionalidades disponibles)
- ✅ `/admin/facturacion` - Gestión de facturación (funcionalidades disponibles)
- ✅ `/admin/auditoria` - Historial de auditoría (controlador pendiente)

### Funcionalidades implementadas
- ✅ Login de administradores y empleados
- ✅ Dashboard principal con navegación
- ✅ Verificación de autenticación
- ✅ Cierre de sesión
- ✅ Enrutamiento básico
- ✅ Creación de propietarios
- ✅ Lista de propietarios
- ✅ Creación de cobros
- ✅ Creación de gastos
- ✅ Generación de facturas
- ✅ Reintento de facturas pendientes

### Funcionalidades pendientes
- ⚠️ CRUD completo de propietarios (actualización, eliminación)
- ⚠️ Gestión de copropietarios completa
- ⚠️ Ver lista de cobros por inmueble
- ⚠️ Distribución de cobros
- ⚠️ Ver lista de gastos por inmueble
- ⚠️ Ver detalles de facturas
- ⚠️ Controlador de Auditoría
- ⚠️ Interfaces mejoradas para cada módulo

## Solución de problemas

### Error 404 al navegar en el panel de administración
Si obtienes un error 404 al intentar acceder a alguna sección del panel:

**Causa probable**: Las rutas del frontend no están creadas

**Solución actual**: Todas las rutas principales del panel de administración han sido creadas:
- ✅ `/admin/propietarios`
- ✅ `/admin/inmuebles`
- ✅ `/admin/cobros`
- ✅ `/admin/gastos`
- ✅ `/admin/facturacion`
- ✅ `/admin/auditoria`

**Estado actual**: Las páginas están disponibles y muestran las funcionalidades reales del backend

**Próximos pasos**: Mejorar las interfaces y agregar funcionalidades adicionales

### Error "Credenciales inválidas"
- Verifica que el email y contraseña sean correctos
- Asegúrate de que el usuario esté activo en la base de datos
- Confirma que estás usando el endpoint correcto (`/api/auth/admin/login`)

### No puedo acceder al dashboard
- Verifica que el token se haya guardado en localStorage
- Confirma que el backend esté corriendo en el puerto 3000
- Revisa la consola del navegador para errores

### Error de conexión
- Asegúrate de que el backend esté funcionando
- Verifica que el puerto 3000 esté disponible
- Confirma que no haya bloqueos de firewall

## Crear nuevos usuarios administradores

Para crear nuevos usuarios administradores o empleados, puedes ejecutar el script de seed:

```bash
cd backend
npm exec ts-node scripts/seed-admin.ts
```

O modificar el archivo `backend/scripts/seed-admin.ts` para agregar más usuarios.
