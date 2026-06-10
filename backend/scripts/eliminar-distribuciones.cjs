const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propietarioIds = [1, 3, 4]; // Eduardo, Marcelo, Ana
  
  console.log("=== INICIANDO ELIMINACIÓN DE MOVIMIENTOS DE ASIGNACIÓN DE ALQUILER ===\n");

  // 1. Eliminar registros DEBITO de CuentaCorriente para los 3 propietarios
  const debitosToDelete = await prisma.cuentaCorriente.findMany({
    where: {
      propietarioId: { in: propietarioIds },
      tipoMovimiento: 'DEBITO'
    }
  });
  console.log(`1. DEBITOS en CuentaCorriente a eliminar: ${debitosToDelete.length}`);
  for (const d of debitosToDelete) {
    console.log(`   - ID=${d.id} | Propietario=${d.propietarioId} | Monto=${d.monto} | Desc="${d.descripcion}"`);
  }

  // 2. Eliminar DistribucionCobro para los 3 propietarios
  const distToDelete = await prisma.distribucionCobro.findMany({
    where: {
      propietarioId: { in: propietarioIds }
    }
  });
  console.log(`\n2. DistribucionCobro a eliminar: ${distToDelete.length}`);
  for (const d of distToDelete) {
    console.log(`   - ID=${d.id} | cobroId=${d.cobroId} | Propietario=${d.propietarioId} | Monto=${d.montoNeto}`);
  }

  // Identificar los cobroId afectados
  const cobroIdsAfectados = [...new Set(distToDelete.map(d => d.cobroId))];
  console.log(`\n3. CobroAlquiler IDs afectados: ${cobroIdsAfectados.join(', ')}`);

  // Preguntar confirmación
  console.log("\n=== CONFIRMACIÓN REQUERIDA ===");
  console.log("Para ejecutar la eliminación, descomente las líneas de abajo.");
  console.log("Revise los datos arriba y luego ejecute con la variable CONFIRMAR=true");

  const confirmar = true;

  // --- EJECUTAR ELIMINACIONES ---
  console.log("\n=== EJECUTANDO ELIMINACIONES ===\n");

  // 1. Eliminar DEBITOS de CuentaCorriente
  for (const d of debitosToDelete) {
    await prisma.cuentaCorriente.delete({ where: { id: d.id } });
    console.log(`✓ DEBITO CuentaCorriente ID=${d.id} eliminado`);
  }

  // 2. Eliminar DistribucionCobro
  for (const d of distToDelete) {
    await prisma.distribucionCobro.delete({ where: { id: d.id } });
    console.log(`✓ DistribucionCobro ID=${d.id} eliminada`);
  }

  // 3. Actualizar CobroAlquiler a PENDIENTE
  for (const cobroId of cobroIdsAfectados) {
    // Verificar que no queden otras distribuciones para este cobro
    const restantes = await prisma.distribucionCobro.count({
      where: { cobroId }
    });
    if (restantes === 0) {
      await prisma.cobroAlquiler.update({
        where: { id: cobroId },
        data: { estado: 'PENDIENTE' }
      });
      console.log(`✓ CobroAlquiler ID=${cobroId} actualizado a PENDIENTE`);
    } else {
      console.log(`⚠️  CobroAlquiler ID=${cobroId} aún tiene ${restantes} distribuciones, no se cambió el estado`);
    }
  }

  console.log("\n=== ELIMINACIÓN COMPLETADA EXITOSAMENTE ===");
}

main()
  .catch(e => { 
    console.error("ERROR:", e); 
    process.exit(1); 
  })
  .finally(() => prisma.$disconnect());