/**
 * Migra los aportes cargados como "DEBITO con monto negativo" al tipo APORTE (monto positivo).
 * El efecto en saldos y caja es neutro: el script lo verifica antes y después.
 *
 * Uso:  npm exec ts-node scripts/migrar-aportes.ts            (solo muestra, no cambia nada)
 *       npm exec ts-node scripts/migrar-aportes.ts -- --aplicar
 */
import { PrismaClient } from '@prisma/client';
import { CuentaCorrienteService } from '../src/cobros/cuenta-corriente.service';

const prisma = new PrismaClient();
const auditoriaStub = { registrar: async () => undefined } as any;
const service = new CuentaCorrienteService(prisma as any, auditoriaStub);
const aplicar = process.argv.includes('--aplicar');

async function foto() {
  const propietarios = await prisma.propietario.findMany({ select: { id: true, nombre: true } });
  const saldos: Record<string, number> = {};
  for (const p of propietarios) saldos[p.nombre] = Math.round((await service.obtenerSaldoActual(p.id)) * 100) / 100;
  const { caja } = await service.obtenerCajaDisponible();
  return { saldos, caja: Math.round(caja * 100) / 100 };
}

async function main() {
  const aMigrar = await prisma.cuentaCorriente.findMany({
    where: { tipoMovimiento: 'DEBITO', monto: { lt: 0 } },
    include: { propietario: { select: { nombre: true } } },
  });

  console.log(`Movimientos a migrar (${aMigrar.length}):`);
  for (const m of aMigrar) console.log(`  #${m.id}  ${m.propietario.nombre.padEnd(28)} ${m.monto.toString().padStart(12)}  ${m.descripcion}`);

  const antes = await foto();
  console.log('\nAntes:', antes);

  if (!aplicar) {
    console.log('\n(modo prueba: no se cambió nada. Ejecutar con --aplicar)');
    return;
  }

  await prisma.$transaction(
    aMigrar.map(m =>
      prisma.cuentaCorriente.update({
        where: { id: m.id },
        data: { tipoMovimiento: 'APORTE', monto: Math.abs(parseFloat(m.monto.toString())) },
      }),
    ),
  );

  const despues = await foto();
  console.log('Después:', despues);
  const iguales = JSON.stringify(antes) === JSON.stringify(despues);
  console.log(iguales ? '\n✓ Saldos y caja sin cambios' : '\n✗ ATENCIÓN: los saldos cambiaron');
}

main().finally(() => prisma.$disconnect());
