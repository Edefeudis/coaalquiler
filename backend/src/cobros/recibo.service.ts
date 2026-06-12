import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ReciboService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async obtenerDatosRecibo(propietarioId: number, periodo: string) {
    const propietario = await this.prisma.propietario.findUnique({
      where: { id: propietarioId },
    });
    if (!propietario) {
      throw new NotFoundException(`Propietario ${propietarioId} no encontrado`);
    }

    const [year, month] = periodo.split('-').map(Number);
    const ini = new Date(year, month - 1, 1, 0, 0, 0);
    const fin = new Date(year, month, 0, 23, 59, 59);

    // Obtener inmuebles del propietario
    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true },
    });

    const idsInmuebles = inmueblePropietarios.map(ip => ip.inmuebleId);

    // Obtener cobros del período para los inmuebles del propietario
    const cobros = await this.prisma.cobroAlquiler.findMany({
      where: {
        inmuebleId: { in: idsInmuebles },
        fechaCobro: { gte: ini, lte: fin },
      },
      include: {
        inmueble: true,
        distribuciones: {
          where: { propietarioId },
          include: { propietario: true },
        },
      },
      orderBy: { fechaCobro: 'asc' },
    });

    // Obtener gastos del período
    const gastos = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: { in: idsInmuebles },
        fecha: { gte: ini, lte: fin },
      },
      include: { inmueble: true },
      orderBy: { fecha: 'asc' },
    });

    // Obtener TODOS los movimientos de CuentaCorriente del propietario
    // y filtrar en JS (porque SQLite almacena fechas en formato texto
    // que no permite comparación correcta vía SQL)
    const todosLosMovimientosCC = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId },
      orderBy: { fecha: 'asc' },
    });

    const movimientosCC = todosLosMovimientosCC.filter(
      m => { const f = new Date(m.fecha); return f >= ini && f <= fin; },
    );

    // Calcular totales
    let totalDistribuciones = 0;
    let totalGastosPropietario = 0;
    let totalRetiros = 0;

    for (const dist of cobros.flatMap(c => c.distribuciones)) {
      totalDistribuciones += parseFloat(dist.montoNeto.toString());
    }

    for (const ip of inmueblePropietarios) {
      const pct = parseFloat(ip.porcentaje.toString()) / 100;
      for (const g of gastos) {
        if (g.inmuebleId === ip.inmuebleId) {
          totalGastosPropietario += parseFloat(g.monto.toString()) * pct;
        }
      }
    }

    for (const mov of movimientosCC) {
      if (mov.tipoMovimiento === 'DEBITO' || mov.tipoMovimiento === 'AJUSTE_NEGATIVO') {
        totalRetiros += parseFloat(mov.monto.toString());
      }
    }

    // ── Calcular saldoAnterior usando la misma lógica que obtenerSaldoActual ──
    // Créditos: cobros(gross) × % - gastos × %  (antes del período)
    const cobrosAntes = await this.prisma.cobroAlquiler.findMany({
      where: {
        inmuebleId: { in: idsInmuebles },
        fechaCobro: { lt: ini },
      },
    });

    const gastosAntes = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: { in: idsInmuebles },
        fecha: { lt: ini },
      },
    });

    // Filtrar movimientos CC antes del período en JS (mismo motivo que arriba)
    const movimientosCCAntes = todosLosMovimientosCC.filter(
      m => new Date(m.fecha) < ini,
    );

    let saldoAnterior = 0;
    for (const ip of inmueblePropietarios) {
      const pct = parseFloat(ip.porcentaje.toString()) / 100;
      const totalCobrosInmueble = cobrosAntes
        .filter(c => c.inmuebleId === ip.inmuebleId)
        .reduce((sum, c) => sum + parseFloat(c.montoBruto.toString()), 0);
      saldoAnterior += totalCobrosInmueble * pct;

      const totalGastosInmueble = gastosAntes
        .filter(g => g.inmuebleId === ip.inmuebleId)
        .reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0);
      saldoAnterior -= totalGastosInmueble * pct;
    }

    // Restar débitos y sumar/restar ajustes de CuentaCorriente (antes del período)
    for (const m of movimientosCCAntes) {
      const monto = parseFloat(m.monto.toString());
      if (m.tipoMovimiento === 'DEBITO' || m.tipoMovimiento === 'AJUSTE_NEGATIVO') {
        saldoAnterior -= monto;
      } else if (m.tipoMovimiento === 'AJUSTE_POSITIVO') {
        saldoAnterior += monto;
      }
      // DISTRIBUCION y CREDITO ya están incluidos vía cobros, no se suman de nuevo
    }

    // ── Calcular totalAcreditado del período: cobros(gross) × % - gastos × % ──
    let totalAcreditado = 0;
    for (const ip of inmueblePropietarios) {
      const pct = parseFloat(ip.porcentaje.toString()) / 100;
      const totalCobrosInmueble = cobros
        .filter(c => c.inmuebleId === ip.inmuebleId)
        .reduce((sum, c) => sum + parseFloat(c.montoBruto.toString()), 0);
      const totalGastosInmueble = gastos
        .filter(g => g.inmuebleId === ip.inmuebleId)
        .reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0);
      totalAcreditado += (totalCobrosInmueble - totalGastosInmueble) * pct;
    }

    // Obtener distribuciones detalladas por inmueble
    const detallePorInmueble = await Promise.all(
      inmueblePropietarios.map(async (ip) => {
        const cobrosInmueble = cobros.filter(c => c.inmuebleId === ip.inmuebleId);
        const gastosInmueble = gastos.filter(g => g.inmuebleId === ip.inmuebleId);
        const pct = parseFloat(ip.porcentaje.toString()) / 100;

        const totalCobros = cobrosInmueble.reduce((sum, c) => sum + parseFloat(c.montoBruto.toString()), 0);
        const totalGastos = gastosInmueble.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0);

        return {
          inmueble: { id: ip.inmueble.id, direccion: ip.inmueble.direccion },
          porcentaje: ip.porcentaje,
          cobros: cobrosInmueble.map(c => ({
            id: c.id,
            periodo: c.periodo,
            fechaCobro: c.fechaCobro,
            montoBruto: c.montoBruto,
            montoNeto: c.montoNeto,
            gastosTotal: c.gastosTotal,
            distribucion: c.distribuciones[0] || null,
          })),
          gastos: gastosInmueble.map(g => ({
            id: g.id,
            concepto: g.concepto,
            fecha: g.fecha,
            monto: g.monto,
            montoPropietario: parseFloat(g.monto.toString()) * pct,
            descripcion: g.descripcion,
          })),
          totales: {
            totalCobros,
            totalGastos,
            cobrosPropietario: totalCobros * pct,
            gastosPropietario: totalGastos * pct,
          },
        };
      })
    );

    const saldoFinal = saldoAnterior + totalAcreditado - totalRetiros;

    return {
      propietario: {
        id: propietario.id,
        nombre: propietario.nombre,
        email: propietario.email,
      },
      periodo,
      fechaEmision: new Date().toISOString(),
      detallePorInmueble,
      movimientosCuentaCorriente: movimientosCC.map(m => ({
        id: m.id,
        fecha: m.fecha,
        tipoMovimiento: m.tipoMovimiento,
        monto: m.monto,
        descripcion: m.descripcion,
        saldoAnterior: m.saldoAnterior,
        saldoNuevo: m.saldoNuevo,
      })),
      resumen: {
        saldoAnteriorPeriodo: saldoAnterior,
        totalAcreditado: totalAcreditado,
        totalRetiros,
        totalGastosPropietario,
        totalDistribuciones,
        saldoFinal,
      },
    };
  }
}