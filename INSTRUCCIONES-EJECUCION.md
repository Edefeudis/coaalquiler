# Instrucciones de Ejecución - CoaAlquiler

## Scripts .bat para ejecutar la aplicación

Se han creado cuatro scripts para facilitar la ejecución de la aplicación:

### 🚀 `start-app-simple.bat` (Recomendado)
Inicia tanto el frontend como el backend en ventanas separadas. Es la opción más simple y confiable.

**Uso:**
1. Doble clic en `start-app-simple.bat`
2. Se abrirán dos ventanas de consola:
   - Una para el Backend (NestJS) en puerto 3000
   - Una para el Frontend (Next.js) en puerto 3001
3. Cierra la ventana principal del script cuando desees

### 🚀 `start-app.bat`
Inicia tanto el frontend como el backend en ventanas separadas con mensajes detallados.

**Uso:**
1. Doble clic en `start-app.bat`
2. Se abrirán dos ventanas de consola:
   - Una para el Backend (NestJS) en puerto 3000
   - Una para el Frontend (Next.js) en puerto 3001
3. La ventana principal del script se cerrará automáticamente

### 🛑 `stop-app.bat`
Detiene todos los procesos de Node.js (frontend y backend).

**Uso:**
1. Doble clic en `stop-app.bat`
2. Se terminarán todos los procesos de Node.js
3. Verás un mensaje de confirmación

### 🔄 `restart-app.bat`
Reinicia la aplicación (detiene y vuelve a iniciar).

**Uso:**
1. Doble clic en `restart-app.bat`
2. Se detendrán los procesos actuales
3. Se iniciarán nuevamente ambos servidores

## URLs de la aplicación

- **Backend API**: http://localhost:3000
- **Frontend Web**: http://localhost:3001

## Configuración de puertos

La aplicación está configurada para usar puertos diferentes para evitar conflictos:

- **Backend (NestJS)**: Puerto 3000
- **Frontend (Next.js)**: Puerto 3001

El frontend está configurado explícitamente para usar el puerto 3001 en `package.json`:
```json
"dev": "next dev -p 3001"
```

Esto asegura que ambos servidores puedan ejecutarse simultáneamente sin conflictos de puerto.

## Credenciales de prueba

Para hacer login en el frontend:
- **Email**: `propietario@test.com`
- **Contraseña**: No se requiere (solo email)

## Notas importantes

- Los servidores se ejecutan en ventanas separadas para facilitar el monitoreo
- Puedes cerrar las ventanas individuales sin afectar la otra aplicación
- Para detener completamente, usa `stop-app.bat` o cierra ambas ventanas
- Si modificas el código, necesitarás reiniciar los servidores (usa `restart-app.bat`)

## Estructura del proyecto

```
c:\EDU\
├── backend/               # NestJS API (puerto 3000)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/              # Next.js App (puerto 3001)
│   ├── app/
│   ├── components/
│   └── package.json
├── start-app-simple.bat   # Iniciar aplicación (recomendado)
├── start-app.bat          # Iniciar aplicación (detallado)
├── stop-app.bat           # Detener aplicación
├── restart-app.bat        # Reiniciar aplicación
└── INSTRUCCIONES-EJECUCION.md
```

## Solución de problemas

### Conflictos de puerto
Si ves que ambos servidores intentan usar el mismo puerto:

**Síntomas:**
- Error "Port 3000 is already in use"
- El frontend no se inicia correctamente
- Ambas ventanas muestran el mismo puerto

**Solución:**
1. Ejecuta `stop-app.bat` para detener todos los procesos
2. Verifica que el `package.json` del frontend tenga: `"dev": "next dev -p 3001"`
3. Ejecuta `start-app-simple.bat` nuevamente

### Los puertos ya están en uso
Si ves errores de puertos ocupados:
1. Ejecuta `stop-app.bat` para limpiar procesos
2. Espera unos segundos
3. Ejecuta `start-app-simple.bat` nuevamente

### Errores de conexión
- Verifica que ambas ventanas de consola estén activas
- Revisa los logs en cada ventana para identificar errores
- Asegúrate de que el backend esté iniciado antes de acceder al frontend

### Base de datos
La base de datos SQLite se encuentra en:
- `backend/prisma/dev.db`

Si necesitas recrear la base de datos:
1. Detén la aplicación con `stop-app.bat`
2. Elimina el archivo `backend/prisma/dev.db`
3. Ejecuta `npm.cmd run prisma:migrate` en el directorio `backend`
4. Ejecuta `npm.cmd exec ts-node scripts/seed.ts` para crear datos de prueba
5. Inicia la aplicación con `start-app.bat`
