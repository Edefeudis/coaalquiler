import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de administrador...');

  // Crear un usuario administrador
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@coaalquiler.com' },
    update: {},
    create: {
      email: 'admin@coaalquiler.com',
      password: hashedPassword,
      nombre: 'Administrador',
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log('Administrador creado:', {
    id: admin.id,
    email: admin.email,
    nombre: admin.nombre,
    rol: admin.rol,
  });

  // Crear un usuario empleado
  const hashedPasswordEmpleado = await bcrypt.hash('empleado123', 10);

  const empleado = await prisma.usuario.upsert({
    where: { email: 'empleado@coaalquiler.com' },
    update: {},
    create: {
      email: 'empleado@coaalquiler.com',
      password: hashedPasswordEmpleado,
      nombre: 'Empleado Inmobiliaria',
      rol: 'EMPLEADO',
      activo: true,
    },
  });

  console.log('Empleado creado:', {
    id: empleado.id,
    email: empleado.email,
    nombre: empleado.nombre,
    rol: empleado.rol,
  });

  console.log('Seed de administrador completado exitosamente!');
  console.log('\nCredenciales de acceso:');
  console.log('Administrador:');
  console.log('  Email: admin@coaalquiler.com');
  console.log('  Contraseña: admin123');
  console.log('\nEmpleado:');
  console.log('  Email: empleado@coaalquiler.com');
  console.log('  Contraseña: empleado123');
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
