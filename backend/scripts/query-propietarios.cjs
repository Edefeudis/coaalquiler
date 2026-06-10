const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prop = await prisma.propietario.findMany({
    where: {
      nombre: { in: ['Eduardo De Feudis', 'Marcelo De Feudis', 'Ana Novelli'] }
    }
  });
  console.log(JSON.stringify(prop, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());