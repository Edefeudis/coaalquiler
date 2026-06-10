const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Primero veamos todos los tipos de movimiento distintos que existen
  const tipos = await prisma.cuentaCorriente.groupBy({
    by: ['tipoMovimiento'],
    _count: true
  });
  console.log("Tipos de movimiento:", JSON.stringify(tipos, null, 2));

  // Veamos los movimientos de tipo DISTRIBUCION para los 3 propietarios
  const movs = await prisma.cuentaCorriente.findMany({
    where: {
      propietarioId: { in: [1, 3, 4] },
      tipoMovimiento: { in: ['DISTRIBUCION', 'CREDITO'] }
    },
    orderBy: { fecha: 'desc' },
    take: 30
  });
  console.log("Movimientos encontrados:", JSON.stringify(movs, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());