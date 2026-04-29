## ADDED Requirements

### Requirement: Multiple owners per property
El sistema DEBE soportar múltiples propietarios asociados a un mismo inmueble, cada uno con un porcentaje de participación definido.

La suma de los porcentajes de todos los propietarios activos de un inmueble DEBE ser exactamente 100%.

#### Scenario: Agregar nuevo copropietario
- **WHEN** se asocia un nuevo propietario a un inmueble con su porcentaje correspondiente
- **THEN** el sistema verifica que la suma total no exceda 100%
- **THEN** se registra la relación en la tabla intermedia
- **THEN** se envía una invitación automática al nuevo propietario

#### Scenario: Suma de porcentajes invalida
- **WHEN** se intenta agregar un propietario con un porcentaje que haga que la suma supere 100%
- **THEN** el sistema rechaza la operación y muestra mensaje de error especifico

---

### Requirement: Propietario individual access
Cada propietario DEBE tener acceso únicamente a los inmuebles en los que tiene participación registrada.

#### Scenario: Login de propietario
- **WHEN** un usuario con rol PROPIETARIO inicia sesión
- **THEN** solo visualiza los inmuebles donde se encuentra registrado como propietario
- **THEN** no tiene acceso a funcionalidades de administración de la inmobiliaria