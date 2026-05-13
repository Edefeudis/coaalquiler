import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class CuentaCorrienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async obtenerSaldoActual(propietarioId: number, inmuebleId?: number) {
    // Obtener los inmuebles del propietario
    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true }
    });

    const idsInmuebles = inmueblePropietarios.map(ip => ip.inmuebleId);
    if (inmuebleId && !idsInmuebles.includes(inmuebleId)) {
      return 0;
    }

    const idsFiltrados = inmuebleId ? [inmuebleId] : idsInmuebles;

    if (idsFiltrados.length === 0) {
      return 0;
    }

    // Obtener cobros de los inmuebles (créditos)
    const cobros = await this.prisma.cobroAlquiler.findMany({
      where: {
        inmuebleId: { in: idsFiltrados }
      }
    });

    // Obtener gastos de los inmuebles (débitos)
    const gastos = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: { in: idsFiltrados }
      }
    });

    // Calcular saldo: cobros por porcentaje - gastos por porcentaje
    let saldoTotal = 0;
    for (const ip of inmueblePropietarios) {
      if (!idsFiltrados.includes(ip.inmuebleId)) continue;

      const porcentaje = parseFloat(ip.porcentaje.toString()) / 100;

      // Cobros del inmueble
      const cobrosInmueble = cobros
        .filter(c => c.inmuebleId === ip.inmuebleId)
        .reduce((sum, c) => sum + parseFloat(c.montoNeto.toString()), 0);

      // Gastos del inmueble
      const gastosInmueble = gastos
        .filter(g => g.inmuebleId === ip.inmuebleId)
        .reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0);

      const cobrosPropietario = cobrosInmueble * porcentaje;
      const gastosPropietario = gastosInmueble * porcentaje;

      saldoTotal += cobrosPropietario - gastosPropietario;
    }

    return saldoTotal;
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
      const montoPropietario = parseFloat(c.montoNeto.toString()) * pct;

      movimientos.push({
        id: c.id,
        fecha: c.fechaCobro,
        tipoMovimiento: 'CREDITO',
        descripcion: `Cobro alquiler - Período ${c.periodo}`,
        monto: montoPropietario,
        referencia: `Cobro ${c.id}`,
        referenciaId: c.id,
        saldoNuevo: 0,
        inmueble: c.inmueble
      });
    }

    // Obtener gastos (débitos)
    const gastos = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: { in: idsFiltrados }
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
        id: g.id + 10000, // Evitar conflicto de IDs
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

    // Ordenar por fecha descendente
    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Calcular saldo running
    let saldo = 0;
    for (const mov of movimientos) {
      if (mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'DISTRIBUCION' || mov.tipoMovimiento === 'AJUSTE_POSITIVO') {
        saldo += mov.monto;
      } else {
        saldo -= mov.monto;
      }
      mov.saldoNuevo = saldo;
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
    const saldoAnterior = await this.obtenerSaldoActual(data.propietarioId, data.inmuebleId);
    
    let saldoNuevo = saldoAnterior;
    
    // Calcular el nuevo saldo según el tipo de movimiento
    switch (data.tipoMovimiento) {
      case 'CREDITO':
      case 'DISTRIBUCION':
        saldoNuevo = saldoAnterior + data.monto;
        break;
      case 'DEBITO':
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

    // Temporarily return mock data until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
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

    // Registrar en auditoría
    await this.auditoria.registrar({
      entidad: 'CuentaCorriente',
      entidadId: movimiento.id,
      accion: 'CREATE',
      datosNuevos: JSON.stringify(movimiento),
    });

    return movimiento;
    */
    return { id: 1, ...data, saldoAnterior, saldoNuevo };
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

    // Obtener los inmuebles del propietario
    const inmueblePropietarios = await this.prisma.inmueblePropietario.findMany({
      where: { propietarioId, activo: true },
      include: { inmueble: true }
    });

    // Calcular saldos por inmueble
    const saldosPorInmueble = [];
    for (const ip of inmueblePropietarios) {
      const distribuciones = await this.prisma.distribucionCobro.findMany({
        where: {
          propietarioId,
          cobro: {
            inmuebleId: ip.inmuebleId
          }
        }
      });

      const gastos = await this.prisma.gastoInmueble.findMany({
        where: {
          inmuebleId: ip.inmuebleId
        }
      });

      const pct = parseFloat(ip.porcentaje.toString()) / 100;

      const totalDistribuciones = distribuciones.reduce(
        (sum, d) => sum + parseFloat(d.montoNeto.toString()), 0
      );

      const totalGastos = gastos.reduce(
        (sum, g) => sum + parseFloat(g.monto.toString()), 0
      ) * pct;

      saldosPorInmueble.push({
        inmueble: ip.inmueble,
        saldo: totalDistribuciones - totalGastos
      });
    }

    // Obtener últimos movimientos (usar el método existente)
    const ultimosMovimientos = await this.obtenerMovimientosPorPropietario(propietarioId);

    return {
      saldoGeneral,
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

        // Obtener gastos del inmueble
        const gastos = await this.prisma.gastoInmueble.findMany({
          where: { 
            inmuebleId: inmueblePropietario.inmuebleId 
          }
        });

        // Obtener distribuciones ya realizadas al propietario
        // Temporarily comment out until Prisma types are resolved
        // const distribuciones = await this.prisma.cuentaCorriente.findMany({
        //   where: { 
        //     propietarioId,
        //     inmuebleId: inmueblePropietario.inmuebleId,
        //     tipoMovimiento: 'DISTRIBUCION'
        //   }
        // });
        const distribuciones: any[] = []; // Temporary mock

        // Calcular totales para este inmueble
        const totalCobrosInmueble = cobros.reduce((sum, cobro) => sum + parseFloat(cobro.montoBruto.toString()), 0);
        const totalGastosInmueble = gastos.reduce((sum, gasto) => sum + parseFloat(gasto.monto.toString()), 0);
        const totalDistribucionesInmueble = distribuciones.reduce((sum, dist) => sum + parseFloat(dist.monto.toString()), 0);
        
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
