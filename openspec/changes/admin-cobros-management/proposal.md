## Why

El sistema actual de gestión de cobros es completamente manual y no proporciona una interfaz adecuada para que el administrador registre los pagos recibidos por el agente inmobiliario. Esto crea ineficiencias operativas y falta visibilidad sobre el estado financiero de las propiedades.

Actualmente el administrador debe:
- Registrar pagos manualmente sin una interfaz dedicada
- Calcular variaciones mensuales de forma manual
- Determinar morosidad revisando cada propiedad individualmente
- No tener un historial consolidado de cobros por propiedad

Esta falta de herramientas de gestión impacta directamente la capacidad del administrador para controlar el flujo financiero del sistema.

## What Changes

Implementar un módulo completo de administración de cobros con interfaz web para registro manual de pagos, cálculo automático de variaciones y detección de morosidad.

## Capabilities

### New Capabilities

- `cobros-management`: Sistema completo de administración de cobros manuales con registro de pagos, cálculo de variaciones y gestión de morosidad

### Modified Capabilities

Ninguna - esta es una funcionalidad completamente nueva.

## Impact

- Nuevo módulo frontend en `/admin/cobros`
- Backend: reutilización y extensión del controlador `CobrosController` existente
- Base de datos: uso del modelo `CobroAlquiler` existente
- Integración con módulo de gastos existente para cálculo de montos netos
