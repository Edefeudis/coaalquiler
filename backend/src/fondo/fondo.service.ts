import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

export const TIPOS_FONDO = ['SALDO_INICIAL', 'INTERES', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] as const;
type TipoFondo = typeof TIPOS_FONDO[number];

/**
 * Fondo de reserva común. Los intereses quedan en el fondo para pagar gastos;
 * no se reparten a las cuentas corrientes. Los gastos con pagadoCon = 'FONDO'
 * salen de acá y no descuentan de la caja ni de los saldos de los propietarios.
 */
@Injectable()
export class FondoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async obtenerSaldo() {
    const num = (d: any) => parseFloat(d.toString());
    const [movs, gastos, reservasCC] = await Promise.all([
      this.prisma.movimientoFondo.findMany({ select: { tipo: true, monto: true } }),
      this.prisma.gastoInmueble.findMany({ where: { pagadoCon: 'FONDO' }, select: { monto: true } }),
      // Reservas registradas desde la cuenta corriente: plata que cada propietario manda al fondo
      this.prisma.cuentaCorriente.findMany({ where: { tipoMovimiento: 'RESERVA' }, select: { monto: true } }),
    ]);
    const suma = (t: string) => movs.filter(m => m.tipo === t).reduce((s, m) => s + num(m.monto), 0);
    const inicial = suma('SALDO_INICIAL');
    const intereses = suma('INTERES');
    const ajustes = suma('AJUSTE_POSITIVO') - suma('AJUSTE_NEGATIVO');
    const reservas = reservasCC.reduce((s, r) => s + num(r.monto), 0);
    const gastosPagados = gastos.reduce((s, g) => s + num(g.monto), 0);
    return {
      saldo: inicial + reservas + intereses + ajustes - gastosPagados,
      inicial,
      reservas,
      intereses,
      ajustes,
      gastosPagados,
    };
  }

  /** Saldo + historial unificado (movimientos del fondo y gastos pagados con el fondo, agrupando gastos comunes). */
  async obtenerResumen() {
    const num = (d: any) => parseFloat(d.toString());
    const [saldo, movs, gastos, reservasCC] = await Promise.all([
      this.obtenerSaldo(),
      this.prisma.movimientoFondo.findMany({ orderBy: { fecha: 'desc' } }),
      this.prisma.gastoInmueble.findMany({
        where: { pagadoCon: 'FONDO' },
        include: { inmueble: { select: { id: true, direccion: true } } },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.cuentaCorriente.findMany({
        where: { tipoMovimiento: 'RESERVA' },
        include: { propietario: { select: { nombre: true } } },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    const historial: any[] = movs.map(m => ({
      id: `m-${m.id}`,
      movimientoId: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      descripcion: m.descripcion,
      monto: num(m.monto),
      entrada: m.tipo !== 'AJUSTE_NEGATIVO',
    }));

    // Las reservas se cargan y se eliminan desde la cuenta corriente del propietario
    for (const r of reservasCC) {
      historial.push({
        id: `r-${r.id}`,
        fecha: r.fecha,
        tipo: 'RESERVA',
        descripcion: r.descripcion,
        propietario: r.propietario.nombre,
        monto: num(r.monto),
        entrada: true,
      });
    }

    const grupos = new Map<string, any>();
    for (const g of gastos) {
      const key = g.grupoId || `g${g.id}`;
      const prev = grupos.get(key);
      if (prev) {
        prev.monto += num(g.monto);
        prev.inmuebles.push(g.inmueble.direccion);
        continue;
      }
      const item = {
        id: `g-${key}`,
        fecha: g.fecha,
        tipo: 'GASTO',
        descripcion: g.concepto,
        monto: num(g.monto),
        entrada: false,
        inmuebles: [g.inmueble.direccion],
      };
      grupos.set(key, item);
      historial.push(item);
    }

    historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Saldo acumulado después de cada movimiento (desde el más viejo)
    let acumulado = 0;
    for (const h of [...historial].reverse()) {
      acumulado += h.entrada ? h.monto : -h.monto;
      h.saldo = acumulado;
    }

    return { ...saldo, historial };
  }

  async registrarMovimiento(data: { tipo: string; monto: number; fecha?: string; descripcion?: string }) {
    if (!TIPOS_FONDO.includes(data.tipo as TipoFondo)) {
      throw new BadRequestException(`Tipo inválido. Use: ${TIPOS_FONDO.join(', ')}`);
    }
    const monto = Math.abs(Number(data.monto));
    if (!(monto > 0)) throw new BadRequestException('El monto debe ser mayor a 0');

    const mov = await this.prisma.movimientoFondo.create({
      data: {
        tipo: data.tipo,
        monto,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        descripcion: data.descripcion?.trim() || null,
      },
    });
    await this.auditoria.registrar({
      entidad: 'MovimientoFondo',
      entidadId: mov.id,
      accion: 'CREATE',
      datosNuevos: JSON.stringify(mov),
    });
    return mov;
  }

  async eliminarMovimiento(id: number) {
    const mov = await this.prisma.movimientoFondo.findUnique({ where: { id } });
    if (!mov) throw new NotFoundException(`Movimiento ${id} no encontrado`);
    await this.auditoria.registrar({
      entidad: 'MovimientoFondo',
      entidadId: id,
      accion: 'DELETE',
      datosPrevios: JSON.stringify(mov),
    });
    return this.prisma.movimientoFondo.delete({ where: { id } });
  }
}
