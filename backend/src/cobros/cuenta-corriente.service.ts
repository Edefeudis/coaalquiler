import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class CuentaCorrienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async obtenerSaldoActual(propietarioId: number, inmuebleId?: number) {
    // Calcular: CREDITOS (CobroAlquiler montoBruto × %) - GASTOS (GastoInmueble × %) - DEBITOS (CtaCte)
    // NO se suma DISTRIBUCION porque ya está incluida en los CREDITOS de CobroAlquiler

    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true }
    });

    const idsInmuebles = inmueblePropietarios.map(ip => ip.inmuebleId);
    if (inmuebleId && !idsInmuebles.includes(inmuebleId)) return 0;
    const idsFiltrados = inmuebleId ? [inmuebleId] : idsInmuebles;
    if (idsFiltrados.length === 0) return 0;

    let saldo = 0;

    // Sumar CREDITOS (cobros × % del propietario)
    for (const ip of inmueblePropietarios) {
      if (!idsFiltrados.includes(ip.inmuebleId)) continue;
      const pct = parseFloat(ip.porcentaje.toString()) / 100;

      const cobros = await this.prisma.cobroAlquiler.findMany({ where: { inmuebleId: ip.inmuebleId } });
      const totalCobros = cobros.reduce((sum, c) => sum + parseFloat(c.montoBruto.toString()), 0) * pct;
      saldo += totalCobros;

      // Solo gastos pagados con la caja: los pagados con el fondo de reserva no tocan las cuentas corrientes
      const gastos = await this.prisma.gastoInmueble.findMany({ where: { inmuebleId: ip.inmuebleId, pagadoCon: 'CAJA' } });
      const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0) * pct;
      saldo -= totalGastos;
    }

    // Restar DEBITOS (transferencias) y RESERVAS (plata que el propietario mandó al fondo de reserva)
    const debitos = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: { in: ['DEBITO', 'RESERVA'] } }
    });
    for (const d of debitos) {
      saldo -= parseFloat(d.monto.toString());
    }

    // Sumar APORTES (plata que el propietario puso para cubrir gastos)
    const aportes = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: 'APORTE' }
    });
    for (const a of aportes) {
      saldo += parseFloat(a.monto.toString());
    }

    // Sumar AJUSTES
    const ajustes = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: { in: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] } }
    });
    for (const a of ajustes) {
      if (a.tipoMovimiento === 'AJUSTE_POSITIVO') saldo += parseFloat(a.monto.toString());
      else saldo -= parseFloat(a.monto.toString());
    }

    return saldo;
  }

  /**
   * Caja disponible: plata que realmente hay para pagar.
   * = cobros (brutos) + aportes - gastos - retiros (DEBITO).
   * Los ajustes manuales son contables y no mueven plata, por eso no entran.
   */
  async obtenerCajaDisponible() {
    const cobros = await this.prisma.cobroAlquiler.findMany({ select: { montoBruto: true } });
    const gastos = await this.prisma.gastoInmueble.findMany({ where: { pagadoCon: 'CAJA' }, select: { monto: true } });
    const movs = await this.prisma.cuentaCorriente.findMany({
      where: { tipoMovimiento: { in: ['DEBITO', 'APORTE', 'RESERVA'] } },
      select: { tipoMovimiento: true, monto: true }
    });
    const num = (d: any) => parseFloat(d.toString());

    const totalCobros = cobros.reduce((s, c) => s + num(c.montoBruto), 0);
    const totalGastos = gastos.reduce((s, g) => s + num(g.monto), 0);
    const sumaTipo = (t: string) => movs.filter(m => m.tipoMovimiento === t).reduce((s, m) => s + num(m.monto), 0);
    const totalAportes = sumaTipo('APORTE');
    const totalRetiros = sumaTipo('DEBITO');
    const totalReservas = sumaTipo('RESERVA'); // pasó de la caja al fondo de reserva

    return {
      caja: totalCobros + totalAportes - totalGastos - totalRetiros - totalReservas,
      totalCobros,
      totalAportes,
      totalGastos,
      totalRetiros,
      totalReservas,
    };
  }

  /**
   * Resumen de todos los propietarios: composición del saldo de cada uno y la caja.
   * Misma lógica que obtenerSaldoActual, pero calculada en una sola pasada.
   */
  async obtenerResumenGeneral() {
    const num = (d: any) => parseFloat(d.toString());
    const [propietarios, cobros, gastos, movs, cajaInfo] = await Promise.all([
      this.prisma.propietario.findMany({
        select: {
          id: true, nombre: true, email: true,
          inmuebles: { where: { activo: true }, select: { inmuebleId: true, porcentaje: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cobroAlquiler.findMany({ select: { inmuebleId: true, montoBruto: true } }),
      this.prisma.gastoInmueble.findMany({ where: { pagadoCon: 'CAJA' }, select: { inmuebleId: true, monto: true } }),
      this.prisma.cuentaCorriente.findMany({
        where: { tipoMovimiento: { in: ['DEBITO', 'APORTE', 'RESERVA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] } },
        select: { propietarioId: true, tipoMovimiento: true, monto: true },
      }),
      this.obtenerCajaDisponible(),
    ]);

    const cobrosPorInm = new Map<number, number>();
    for (const c of cobros) cobrosPorInm.set(c.inmuebleId, (cobrosPorInm.get(c.inmuebleId) || 0) + num(c.montoBruto));
    const gastosPorInm = new Map<number, number>();
    for (const g of gastos) gastosPorInm.set(g.inmuebleId, (gastosPorInm.get(g.inmuebleId) || 0) + num(g.monto));

    const caja = cajaInfo.caja;
    const filas = propietarios.map(p => {
      let cobrosP = 0, gastosP = 0;
      for (const ip of p.inmuebles) {
        const pct = num(ip.porcentaje) / 100;
        cobrosP += (cobrosPorInm.get(ip.inmuebleId) || 0) * pct;
        gastosP += (gastosPorInm.get(ip.inmuebleId) || 0) * pct;
      }
      const propios = movs.filter(m => m.propietarioId === p.id);
      const suma = (tipo: string) => propios.filter(m => m.tipoMovimiento === tipo).reduce((s, m) => s + num(m.monto), 0);
      const aportes = suma('APORTE');
      const retiros = suma('DEBITO');
      const reservas = suma('RESERVA');
      const ajustes = suma('AJUSTE_POSITIVO') - suma('AJUSTE_NEGATIVO');
      const saldo = cobrosP - gastosP + aportes - retiros - reservas + ajustes;
      const transferible = Math.max(0, Math.min(saldo, caja));
      return {
        propietario: { id: p.id, nombre: p.nombre, email: p.email },
        cantidadInmuebles: p.inmuebles.length,
        cobros: cobrosP,
        gastos: gastosP,
        aportes,
        retiros,
        reservas,
        ajustes,
        saldo,
        transferible,
        pendienteDeCobro: Math.max(0, saldo - transferible),
      };
    });

    return {
      caja: cajaInfo,
      propietarios: filas,
      totales: {
        aFavor: filas.reduce((s, f) => s + Math.max(0, f.saldo), 0),
        adeudado: filas.reduce((s, f) => s + Math.min(0, f.saldo), 0),
        saldoNeto: filas.reduce((s, f) => s + f.saldo, 0),
      },
    };
  }

  /**
   * Monto que realmente se le puede transferir a un propietario:
   * lo menor entre su saldo (derecho) y la caja disponible, nunca negativo.
   */
  async obtenerSaldoTransferible(propietarioId: number) {
    const saldo = await this.obtenerSaldoActual(propietarioId);
    const { caja } = await this.obtenerCajaDisponible();
    const transferible = Math.max(0, Math.min(saldo, caja));
    return {
      saldo,
      caja,
      transferible,
      pendienteDeCobro: Math.max(0, saldo - transferible),
    };
  }

  async obtenerMovimientosPorPropietario(propietarioId: number, inmuebleId?: number) {
    // Obtener los inmuebles del propietario
    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true }
    });

    const idsInmuebles = inmueblePropietarios.map(ip => ip.inmuebleId);
    if (inmuebleId && !idsInmuebles.includes(inmuebleId)) {
      return [];
    }

    const idsFiltrados = inmuebleId ? [inmuebleId] : idsInmuebles;

    if (idsFiltrados.length === 0) {
      return [];
    }

    const movimientos: any[] = [];

    // Obtener cobros de los inmuebles (créditos)
    const cobros = await this.prisma.cobroAlquiler.findMany({
      where: {
        inmuebleId: { in: idsFiltrados }
      },
      include: {
        inmueble: true
      },
      orderBy: {
        fechaCobro: 'desc'
      }
    });

    for (const c of cobros) {
      const ip = inmueblePropietarios.find(i => i.inmuebleId === c.inmuebleId);
      if (!ip) continue;

      const pct = parseFloat(ip.porcentaje.toString()) / 100;
      const montoPropietario = parseFloat(c.montoBruto.toString()) * pct;

      movimientos.push({
        id: c.id,
        fecha: c.fechaCobro,
        tipoMovimiento: 'CREDITO',
        descripcion: `Cobro alquiler ${c.inmueble.direccion} - Período ${c.periodo}`,
        monto: montoPropietario,
        referencia: `Cobro ${c.id}`,
        referenciaId: c.id,
        saldoNuevo: 0,
        inmueble: c.inmueble
      });
    }

    // Obtener gastos (débitos) pagados con la caja
    const gastos = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: { in: idsFiltrados },
        pagadoCon: 'CAJA'
      },
      include: {
        inmueble: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    for (const g of gastos) {
      const ip = inmueblePropietarios.find(i => i.inmuebleId === g.inmuebleId);
      if (!ip) continue;

      const pct = parseFloat(ip.porcentaje.toString()) / 100;
      const montoPropietario = parseFloat(g.monto.toString()) * pct;

      movimientos.push({
        id: g.id + 10000,
        fecha: g.fecha,
        tipoMovimiento: 'GASTO',
        descripcion: g.concepto,
        monto: montoPropietario,
        referencia: `Gasto ${g.id}`,
        referenciaId: g.id,
        saldoNuevo: 0,
        inmueble: g.inmueble
      });
    }

    // Obtener DEBITOS desde CuentaCorriente (retiros/pagos)
    const debitos = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: 'DEBITO' },
      orderBy: { fecha: 'desc' }
    });

    for (const d of debitos) {
      movimientos.push({
        id: d.id + 30000,
        fecha: d.fecha,
        tipoMovimiento: 'DEBITO',
        descripcion: d.descripcion || 'Retiro de fondos',
        monto: parseFloat(d.monto.toString()),
        referencia: d.referencia || `Retiro ${d.id}`,
        referenciaId: d.id,
        saldoNuevo: 0,
        inmueble: null
      });
    }

    // Obtener reservas (plata enviada al fondo de reserva)
    const reservas = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: 'RESERVA' },
      orderBy: { fecha: 'desc' }
    });

    for (const r of reservas) {
      movimientos.push({
        id: r.id + 60000,
        fecha: r.fecha,
        tipoMovimiento: 'RESERVA',
        descripcion: r.descripcion || 'Reserva al fondo',
        monto: parseFloat(r.monto.toString()),
        referencia: r.referencia || `Reserva ${r.id}`,
        referenciaId: r.id,
        saldoNuevo: 0,
        inmueble: null
      });
    }

    // Obtener aportes desde CuentaCorriente
    const aportes = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: 'APORTE' },
      orderBy: { fecha: 'desc' }
    });

    for (const a of aportes) {
      movimientos.push({
        id: a.id + 50000,
        fecha: a.fecha,
        tipoMovimiento: 'APORTE',
        descripcion: a.descripcion || 'Aporte para gastos',
        monto: parseFloat(a.monto.toString()),
        referencia: a.referencia || `Aporte ${a.id}`,
        referenciaId: a.id,
        saldoNuevo: 0,
        inmueble: null
      });
    }

    // Obtener ajustes desde CuentaCorriente
    const ajustes = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId, tipoMovimiento: { in: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] } },
      orderBy: { fecha: 'desc' }
    });

    for (const a of ajustes) {
      movimientos.push({
        id: a.id + 40000,
        fecha: a.fecha,
        tipoMovimiento: a.tipoMovimiento as string,
        descripcion: a.descripcion || 'Ajuste manual',
        monto: parseFloat(a.monto.toString()),
        referencia: a.referencia || `Ajuste ${a.id}`,
        referenciaId: a.id,
        saldoNuevo: 0,
        inmueble: null
      });
    }

    // Calcular saldo total desde el más viejo (CREDITO suma, GASTO/DEBITO/AJUSTE_NEGATIVO restan)
    let saldoTotal = 0;
    for (const mov of [...movimientos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())) {
      if (mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'AJUSTE_POSITIVO' || mov.tipoMovimiento === 'APORTE') {
        saldoTotal += mov.monto;
      } else {
        saldoTotal -= mov.monto;
      }
    }

    // Orden descendente para mostrar
    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Asignar saldoNuevo retrocediendo
    let saldoCorriente = saldoTotal;
    for (const mov of movimientos) {
      mov.saldoNuevo = saldoCorriente;
      if (mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'AJUSTE_POSITIVO' || mov.tipoMovimiento === 'APORTE') {
        saldoCorriente -= mov.monto;
      } else {
        saldoCorriente += mov.monto;
      }
    }

    return movimientos;
  }

  async registrarMovimiento(data: {
    propietarioId: number;
    inmuebleId?: number;
    tipoMovimiento: string;
    monto: number;
    referencia?: string;
    referenciaId?: number;
    descripcion?: string;
  }) {
    if (['DEBITO', 'APORTE', 'RESERVA'].includes(data.tipoMovimiento)) {
      if (!(data.monto > 0)) {
        throw new BadRequestException('El monto debe ser mayor a 0. Para registrar plata que puso el propietario use el tipo APORTE.');
      }
    }

    if (data.tipoMovimiento === 'DEBITO' || data.tipoMovimiento === 'RESERVA') {
      // Transferir o reservar saca plata de la caja: no puede superar el saldo del propietario ni lo que hay en caja
      const { saldo, caja, transferible } = await this.obtenerSaldoTransferible(data.propietarioId);
      if (data.monto > transferible + 0.005) {
        const accion = data.tipoMovimiento === 'RESERVA' ? 'reservar' : 'transferir';
        const motivo = caja < saldo
          ? `no hay fondos suficientes en caja (caja: ${caja.toFixed(2)})`
          : `supera el saldo del propietario (${saldo.toFixed(2)})`;
        throw new BadRequestException(`No se puede ${accion} ${data.monto.toFixed(2)}: ${motivo}. Máximo disponible: ${transferible.toFixed(2)}.`);
      }
    }

    const saldoAnterior = await this.obtenerSaldoActual(data.propietarioId, data.inmuebleId);

    let saldoNuevo = saldoAnterior;

    // Calcular el nuevo saldo según el tipo de movimiento
    switch (data.tipoMovimiento) {
      case 'CREDITO':
      case 'DISTRIBUCION':
      case 'APORTE':
        saldoNuevo = saldoAnterior + data.monto;
        break;
      case 'DEBITO':
      case 'RESERVA':
      case 'GASTO':
      case 'AJUSTE_NEGATIVO':
        saldoNuevo = saldoAnterior - data.monto;
        break;
      case 'AJUSTE_POSITIVO':
        saldoNuevo = saldoAnterior + data.monto;
        break;
      default:
        throw new Error(`Tipo de movimiento no válido: ${data.tipoMovimiento}`);
    }

    const movimiento = await this.prisma.cuentaCorriente.create({
      data: {
        propietarioId: data.propietarioId,
        inmuebleId: data.inmuebleId,
        tipoMovimiento: data.tipoMovimiento,
        monto: data.monto,
        saldoAnterior,
        saldoNuevo,
        referencia: data.referencia,
        referenciaId: data.referenciaId,
        descripcion: data.descripcion,
      }
    });

    // Enriquecer con datos del propietario para el recibo
    const propietario = await this.prisma.propietario.findUnique({
      where: { id: data.propietarioId },
      select: { id: true, nombre: true, email: true }
    });

    return {
      ...movimiento,
      propietario
    };
  }

  /**
   * Reserva al fondo sacando de uno o varios propietarios a la vez (todo o nada).
   * Cada parte no puede superar el saldo del propietario y la suma no puede superar la caja.
   */
  async registrarReservaMultiple(data: { items: { propietarioId: number; monto: number }[]; descripcion?: string; fecha?: string }) {
    const items = (data.items || [])
      .map(i => ({ propietarioId: Number(i.propietarioId), monto: Math.round(Number(i.monto) * 100) / 100 }))
      .filter(i => i.monto > 0);
    if (items.length === 0) throw new BadRequestException('Indique al menos un propietario con monto mayor a 0');
    if (new Set(items.map(i => i.propietarioId)).size !== items.length) throw new BadRequestException('Hay propietarios repetidos');

    const { caja } = await this.obtenerCajaDisponible();
    const total = items.reduce((s, i) => s + i.monto, 0);
    if (total > caja + 0.005) {
      throw new BadRequestException(`No hay fondos suficientes en caja para reservar ${total.toFixed(2)} (caja: ${caja.toFixed(2)})`);
    }

    const propietarios = await this.prisma.propietario.findMany({
      where: { id: { in: items.map(i => i.propietarioId) } },
      select: { id: true, nombre: true },
    });
    const saldos = new Map<number, number>();
    for (const i of items) {
      const p = propietarios.find(x => x.id === i.propietarioId);
      if (!p) throw new NotFoundException(`Propietario ${i.propietarioId} no encontrado`);
      const saldo = await this.obtenerSaldoActual(i.propietarioId);
      if (i.monto > saldo + 0.005) {
        throw new BadRequestException(`${p.nombre}: no puede reservar ${i.monto.toFixed(2)}, su saldo es ${saldo.toFixed(2)}`);
      }
      saldos.set(i.propietarioId, saldo);
    }

    const descripcion = data.descripcion?.trim() || (items.length > 1 ? `Reserva al fondo (${items.length} propietarios, total ${total.toFixed(2)})` : 'Reserva al fondo');
    const fecha = data.fecha ? new Date(data.fecha) : new Date();
    const creados = await this.prisma.$transaction(items.map(i => this.prisma.cuentaCorriente.create({
      data: {
        propietarioId: i.propietarioId,
        tipoMovimiento: 'RESERVA',
        monto: i.monto,
        saldoAnterior: saldos.get(i.propietarioId)!,
        saldoNuevo: saldos.get(i.propietarioId)! - i.monto,
        descripcion,
        fecha,
      },
    })));

    for (const c of creados) {
      await this.auditoria.registrar({
        entidad: 'CuentaCorriente', entidadId: c.id, accion: 'CREATE',
        datosNuevos: JSON.stringify({ ...c, reservaMultiple: { propietarios: items.length, total } }),
      });
    }
    return { total, movimientos: creados };
  }

  async registrarDistribucionCobro(cobroId: number, distribucionId: number) {
    // Temporarily return mock data until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    const distribucion = await this.prisma.distribucionCobro.findUnique({
      where: { id: distribucionId },
      include: {
        cobro: {
          include: { inmueble: true }
        },
        propietario: true
      }
    });

    if (!distribucion) {
      throw new NotFoundException(`Distribución ${distribucionId} no encontrada`);
    }

    return this.registrarMovimiento({
      propietarioId: distribucion.propietarioId,
      inmuebleId: distribucion.cobro.inmuebleId,
      tipoMovimiento: 'DISTRIBUCION',
      monto: parseFloat(distribucion.montoNeto.toString()),
      referencia: `Cobro ${cobroId}`,
      referenciaId: cobroId,
      descripcion: `Distribución de cobro - Período ${distribucion.cobro.periodo}`
    });
    */
    return this.registrarMovimiento({
      propietarioId: 1,
      inmuebleId: 1,
      tipoMovimiento: 'DISTRIBUCION',
      monto: 1000,
      referencia: `Cobro ${cobroId}`,
      referenciaId: cobroId,
      descripcion: `Distribución de cobro mock`
    });
  }

  async registrarGastoPropietario(gastoId: number, propietarioId: number, monto: number, inmuebleId: number) {
    return this.registrarMovimiento({
      propietarioId,
      inmuebleId,
      tipoMovimiento: 'GASTO',
      monto,
      referencia: `Gasto ${gastoId}`,
      referenciaId: gastoId,
      descripcion: `Distribución de gasto`
    });
  }

  async obtenerResumenPropietario(propietarioId: number) {
    // Obtener saldo general
    const saldoGeneral = await this.obtenerSaldoActual(propietarioId);
    const { caja, transferible, pendienteDeCobro } = await this.obtenerSaldoTransferible(propietarioId);

    // Obtener los inmuebles del propietario
    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true }
    });

    // Mostrar el monto distribuido en el ÚLTIMO MES de cada propiedad
    // Si no hay cobros registrados aún, mostrar 0
    const saldosPorInmueble = [];
    for (const ip of inmueblePropietarios) {
      const pct = parseFloat(ip.porcentaje.toString()) / 100;

      // Obtener el cobro más reciente de esta propiedad
      const ultimoCobro = await this.prisma.cobroAlquiler.findFirst({
        where: { inmuebleId: ip.inmuebleId },
        orderBy: { fechaCobro: 'desc' }
      });

      const montoDistribuido = ultimoCobro
        ? parseFloat(ultimoCobro.montoBruto.toString()) * pct
        : 0;

      const periodo = ultimoCobro?.periodo || null;

      saldosPorInmueble.push({
        inmueble: ip.inmueble,
        saldo: montoDistribuido,
        periodo,
        montoBruto: ultimoCobro ? parseFloat(ultimoCobro.montoBruto.toString()) : 0,
        porcentajePropietario: pct * 100,
      });
    }

    // Obtener últimos movimientos (usar el método existente)
    const ultimosMovimientos = await this.obtenerMovimientosPorPropietario(propietarioId);

    return {
      saldoGeneral,
      cajaDisponible: caja,
      transferible,
      pendienteDeCobro,
      saldosPorInmueble,
      ultimosMovimientos: ultimosMovimientos.slice(0, 10)
    };
  }

  async obtenerSaldosPorInmueble(inmuebleId: number) {
    // Temporarily return mock data until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    // Obtener todos los propietarios del inmueble
    const inmueble = await this.prisma.inmueble.findUnique({
      where: { id: inmuebleId },
      include: {
        propietarios: {
          include: {
            propietario: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }
      }
    });

    if (!inmueble) {
      throw new NotFoundException(`Inmueble ${inmuebleId} no encontrado`);
    }

    // Obtener saldos para cada propietario
    const saldosPropietarios = await Promise.all(
      inmueble.propietarios.map(async (inmueblePropietario) => {
        const saldoActual = await this.obtenerSaldoActual(inmueblePropietario.propietarioId, inmuebleId);
        
        return {
          propietario: inmueblePropietario.propietario,
          porcentaje: parseFloat(inmueblePropietario.porcentaje.toString()),
          saldoActual,
          tieneSaldoPendiente: saldoActual > 0
        };
      })
    );

    return {
      inmueble: {
        id: inmueble.id,
        direccion: inmueble.direccion
      },
      propietarios: saldosPropietarios,
      totalSaldoPendiente: saldosPropietarios.reduce((sum, p) => sum + p.saldoActual, 0)
    };
    */
    
    // Return mock data for testing
    return {
      inmueble: {
        id: inmuebleId,
        direccion: "Dirección de prueba"
      },
      propietarios: [
        {
          propietario: {
            id: 1,
            nombre: "Propietario de prueba",
            email: "propietario@test.com"
          },
          porcentaje: 100,
          saldoActual: 0,
          tieneSaldoPendiente: false
        }
      ],
      totalSaldoPendiente: 0
    };
  }

  async registrarAjusteManual(data: {
    propietarioId: number;
    inmuebleId?: number;
    monto: number;
    tipo: 'POSITIVO' | 'NEGATIVO';
    descripcion: string;
  }) {
    return this.registrarMovimiento({
      propietarioId: data.propietarioId,
      inmuebleId: data.inmuebleId,
      tipoMovimiento: data.tipo === 'POSITIVO' ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
      monto: Math.abs(data.monto),
      descripcion: data.descripcion
    });
  }

  async eliminarMovimiento(id: number) {
    const movimiento = await this.prisma.cuentaCorriente.findUnique({
      where: { id }
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento ${id} no encontrado`);
    }

    // Solo permitir eliminar DEBITO (distribuciones/retiros)
    if (!['DEBITO', 'DISTRIBUCION', 'APORTE', 'RESERVA'].includes(movimiento.tipoMovimiento)) {
      throw new BadRequestException('Solo se pueden eliminar movimientos de tipo DEBITO, APORTE, RESERVA o DISTRIBUCION');
    }

    await this.prisma.cuentaCorriente.delete({
      where: { id }
    });

    await this.auditoria.registrar({
      entidad: 'CuentaCorriente',
      entidadId: id,
      accion: 'DELETE',
      datosPrevios: JSON.stringify(movimiento),
    });

    return { message: 'Movimiento eliminado exitosamente', movimiento };
  }

  async recalcularSaldos(propietarioId: number) {
    try {
      console.log(`Iniciando recálculo de saldos para propietario ${propietarioId}`);
      
      // Obtener información del propietario
      const propietario = await this.prisma.propietario.findUnique({
        where: { id: propietarioId },
        include: {
          inmuebles: {
            include: {
              inmueble: true
            }
          }
        }
      });

      if (!propietario) {
        throw new NotFoundException(`Propietario ${propietarioId} no encontrado`);
      }

      console.log(`Propietario encontrado: ${propietario.nombre} con ${propietario.inmuebles.length} inmuebles`);

      // Calcular totales por inmueble
      const detallesPorInmueble = [];
      let totalCobrosPropietario = 0;
      let totalGastosPropietario = 0;
      let totalDistribucionesPropietario = 0;

      for (const inmueblePropietario of propietario.inmuebles) {
        console.log(`Procesando inmueble: ${inmueblePropietario.inmueble.direccion} (${inmueblePropietario.porcentaje}%)`);
        
        // Obtener cobros del inmueble
        const cobros = await this.prisma.cobroAlquiler.findMany({
          where: { 
            inmuebleId: inmueblePropietario.inmuebleId 
          }
        });

        // Obtener gastos del inmueble pagados con la caja
        const gastos = await this.prisma.gastoInmueble.findMany({
          where: {
            inmuebleId: inmueblePropietario.inmuebleId,
            pagadoCon: 'CAJA'
          }
        });

        // Obtener distribuciones ya realizadas al propietario desde distribucionCobro
        const distribuciones = await this.prisma.distribucionCobro.findMany({
          where: { 
            propietarioId,
            cobro: {
              inmuebleId: inmueblePropietario.inmuebleId
            }
          }
        });

        // Calcular totales para este inmueble
        const totalCobrosInmueble = cobros.reduce((sum, cobro) => sum + parseFloat(cobro.montoBruto.toString()), 0);
        const totalGastosInmueble = gastos.reduce((sum, gasto) => sum + parseFloat(gasto.monto.toString()), 0);
        const totalDistribucionesInmueble = distribuciones.reduce((sum, dist) => sum + parseFloat(dist.montoNeto.toString()), 0);
        
        // Calcular porcentaje del propietario
        const porcentaje = parseFloat(inmueblePropietario.porcentaje.toString()) / 100;
        const cobrosPropietario = totalCobrosInmueble * porcentaje;
        const gastosPropietario = totalGastosInmueble * porcentaje;
        
        // Saldo actual del propietario para este inmueble
        const saldoActual = cobrosPropietario - gastosPropietario - totalDistribucionesInmueble;

        detallesPorInmueble.push({
          inmueble: inmueblePropietario.inmueble,
          porcentaje: inmueblePropietario.porcentaje,
          totalCobros: totalCobrosInmueble,
          totalGastos: totalGastosInmueble,
          cobrosPropietario,
          gastosPropietario,
          totalDistribuciones: totalDistribucionesInmueble,
          saldoActual
        });

        totalCobrosPropietario += cobrosPropietario;
        totalGastosPropietario += gastosPropietario;
        totalDistribucionesPropietario += totalDistribucionesInmueble;
      }

      const saldoFinal = totalCobrosPropietario - totalGastosPropietario - totalDistribucionesPropietario;

      console.log('Resumen del recálculo:', {
        totalCobrosPropietario,
        totalGastosPropietario,
        totalDistribucionesPropietario,
        saldoFinal
      });

      // Registrar en auditoría
      await this.auditoria.registrar({
        entidad: 'CuentaCorriente',
        entidadId: propietarioId,
        accion: 'RECALCULATE',
        datosNuevos: JSON.stringify({ 
          totalCobrosPropietario,
          totalGastosPropietario,
          totalDistribucionesPropietario,
          saldoFinal,
          detallesPorInmueble
        })
      });

      return { 
        message: 'Saldos recalculados exitosamente',
        propietario: {
          id: propietario.id,
          nombre: propietario.nombre,
          email: propietario.email
        },
        totalCobrosPropietario,
        totalGastosPropietario,
        totalDistribucionesPropietario,
        saldoFinal,
        detallesPorInmueble
      };
    } catch (error) {
      console.error('Error en recálculo de saldos:', error);
      throw error;
    }
  }
}
