import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Crear un propietario de prueba
  const propietario = await prisma.propietario.upsert({
    where: { email: 'propietario@test.com' },
    update: {},
    create: {
      email: 'propietario@test.com',
      nombre: 'Juan Pérez',
    },
  });

  console.log('Propietario creado:', propietario);

  // Crear un inmueble de prueba
  const inmueble = await prisma.inmueble.upsert({
    where: { id: 1 },
    update: {},
    create: {
      direccion: 'Av. Corrientes 1234, Piso 5, Depto A',
    },
  });

  console.log('Inmueble creado:', inmueble);

  // Asociar el propietario con el inmueble (100%)
  const relacion = await prisma.inmueblePropietario.upsert({
    where: {
      inmuebleId_propietarioId: {
        inmuebleId: inmueble.id,
        propietarioId: propietario.id,
      },
    },
    update: {},
    create: {
      inmuebleId: inmueble.id,
      propietarioId: propietario.id,
      porcentaje: 100,
      activo: true,
      fechaAlta: new Date(),
    },
  });

  console.log('Relación creada:', relacion);

  console.log('Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
