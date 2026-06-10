const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Ver todos los registros en CuentaCorriente
  const todos = await prisma.cuentaCorriente.findMany({
    include: { propietario: true }
  });
  console.log("TODOS los movimientos de CuentaCorriente:");
  console.log(JSON.stringify(todos, null, 2));
  
  // Ver distribuciones
  const dist = await prisma.distribucionCobro.findMany();
  console.log("\nDistribuciones:", JSON.stringify(dist, null, 2));
  
  // Ver cobros
  const cobros = await prisma.cobroAlquiler.findMany();
  console.log("\nCobros:", JSON.stringify(cobros, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());