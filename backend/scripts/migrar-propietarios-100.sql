-- Migración 1.3: Copiar propietarios existentes a inmueble_propietarios con 100%
-- Requisito: existe un campo propietarioId en tabla inmueble (relación anterior 1:N)
-- Si no existe ese campo, esta migración debe adaptarse manualmente.

INSERT INTO InmueblePropietario (inmuebleId, propietarioId, porcentaje, fechaAlta, activo)
SELECT
  i.id AS inmuebleId,
  i.propietarioId AS propietarioId,
  100.00 AS porcentaje,
  NOW() AS fechaAlta,
  true AS activo
FROM Inmueble i
LEFT JOIN InmueblePropietario ip ON i.id = ip.inmuebleId AND ip.activo = true
WHERE ip.inmuebleId IS NULL AND i.propietarioId IS NOT NULL;

-- Verificación: contar inmuebles cuyos porcentajes no sumen 100%
SELECT
  i.id,
  SUM(ip.porcentaje) AS total_porcentaje
FROM Inmueble i
JOIN InmueblePropietario ip ON i.id = ip.inmuebleId AND ip.activo = true
GROUP BY i.id
HAVING ABS(SUM(ip.porcentaje) - 100) > 0.01;
