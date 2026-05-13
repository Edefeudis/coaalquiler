## Context

El sistema actual tiene un módulo de cobros básico en el backend (`CobrosController`) pero no tiene interfaz frontend. El flujo actual es completamente manual: el administrador debe registrar los pagos recibidos por el agente inmobiliario sin herramientas visuales adecuadas. 

El modelo `CobroAlquiler` ya existe en la base de datos con campos para `periodo`, `montoBruto`, `montoNeto`, `fechaCobro` y `estado`. El módulo de gastos ya está implementado y funcionando.

## Goals / Non-Goals

**Goals:**
- Crear una interfaz web completa para administración de cobros manuales
- Implementar registro simple y rápido de pagos por inmueble
- Calcular automáticamente variaciones mensuales contra el cobro anterior
- Determinar morosidad cuando no hay cobro en el período
- Proporcionar historial completo y reportes básicos

**Non-Goals:**
- No implementar notificaciones automáticas (fuera de alcance)
- No integrar pasarelas de pago (fuera de alcance)
- No modificar el modelo de datos existente (reutilizar)

## Decisions

**Frontend Framework: Next.js App Router**
- Se mantiene consistencia con el resto del sistema (`/admin/gastos`, `/admin/inmuebles`)
- Reutilización de componentes existentes (formularios, tablas, modales)

**Backend Strategy: Extender controlador existente**
- Reutilizar `CobrosController` existente en lugar de crear uno nuevo
- Agregar endpoints específicos para la interfaz web
- Mantener compatibilidad con API existente

**Manejo de Estado: React useState**
- Estado local para formulario de cobro
- Estado para lista de cobros filtrados
- Estado para inmueble seleccionado

**Cálculo de Variación: Comparación simple**
- Variación = ((Monto actual - Monto anterior) / Monto anterior) * 100
- Basado en el último cobro registrado del mismo inmueble
- Manejo de primer mes sin cobro anterior (sin variación)

**Detección de Morosidad: Regla simple**
- Si no hay cobro en el período actual → estado = MORA
- Período determinado por `periodo` (formato YYYY-MM)
- No requiere lógica compleja de fechas de vencimiento

## Risks / Trade-offs

**[Risk]** Cálculo incorrecto de variación → Mitigación: Validar que exista cobro anterior antes de calcular
**[Risk]** Estado inconsistente de morosidad → Mitigación: Regla clara basada únicamente en existencia de cobro
**[Risk]** Performance con muchos cobros → Mitigación: Paginación y filtrado por período
**[Trade-off]** Simplicidad vs flexibilidad: Se prioriza simplicidad del flujo manual sobre automatización compleja

## Migration Plan

1. Crear página `/admin/cobros` con interfaz de registro
2. Extender `CobrosController` con endpoint para listar cobros por inmueble con filtros
3. Implementar frontend que consuma estos endpoints
4. Integrar con módulo de gastos existente para cálculo de montos netos
5. Testing con datos de muestra

## Open Questions

- ¿Se requiere manejo de diferentes monedas o solo ARS? (RESUELTO: ARS)
- ¿Hay necesidad de exportar datos a Excel o PDF? (RESUELTO: PDF)
- ¿El período debe ser siempre mensual o se necesita flexibilidad? (RESUELTO: Siempre mensual)
- ¿La cuenta corriente debe persistir entre períodos o reiniciarse cada mes? (RESUELTO: Persistir)

## Additional Requirements (Updated)

**Período Fijo Mensual:**
- Sistema trabajará exclusivamente con períodos mensuales (YYYY-MM)
- No habrá flexibilidad para períodos quincenales o semanales
- Cada cobro se asigna automáticamente al mes correspondiente

**Cuenta Corriente Persistente:**
- Saldo acumulado entre períodos (no reinicia mensualmente)
- Histórico completo de todos los movimientos
- Posibilidad de registrar distribuciones manuales adicionales

**Registro de Distribuciones Manuales:**
- Se podrán registrar pagos directos a propietarios
- Estos movimientos afectarán la cuenta corriente
- Referencia clara al cobro original o motivo de la distribución

**PDF con Filtros de Fechas:**
- Exportación por rango de fechas específico
- Sugerencia automática de mes completo
- Flexibilidad para períodos personalizados

## Additional Requirements (Updated)

**PDF Export:**
- Sistema generará PDF con resumen de cobros por propiedad
- PDF incluirá desglose de distribución por propietario
- Formato profesional con logos y datos de contacto
- Totales generales y subtotales por propietario
- Posibilidad de descargar PDF por período específico

## Additional Requirements (Updated)

**Moneda:** 
- Sistema trabajará exclusivamente con Pesos Argentinos (ARS)
- Todos los montos se mostrarán con símbolo "$" asumiendo ARS
- Formato de moneda consistente en toda la interfaz

**Cuenta Corriente por Propietario:**
- Cada cobro generará movimientos en cuenta corriente
- Saldo disponible = (Suma cobros) - (Suma gastos) por propietario
- Visualización de saldo disponible por propietario en tiempo real
- Historial completo de movimientos por propietario

**Cálculo de Distribución:**
- Porcentaje de propietario × (monto cobrado - gastos) = monto a acreditar
- Sistema debe mostrar desglose de cómo se calcula el saldo disponible
