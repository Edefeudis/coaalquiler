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
    // Temporarily return 0 until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    const whereClause: any = { propietarioId };
    if (inmuebleId) {
      whereClause.inmuebleId = inmuebleId;
    }

    const ultimoMovimiento = await this.prisma.cuentaCorriente.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return ultimoMovimiento ? parseFloat(ultimoMovimiento.saldoNuevo.toString()) : 0;
    */
    return 0;
  }

  async obtenerMovimientosPorPropietario(propietarioId: number, inmuebleId?: number) {
    // Temporarily return empty array until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    const whereClause: any = { propietarioId };
    if (inmuebleId) {
      whereClause.inmuebleId = inmuebleId;
    }

    return this.prisma.cuentaCorriente.findMany({
      where: whereClause,
      include: {
        propietario: {
          select: { id: true, nombre: true, email: true }
        },
        inmueble: {
          select: { id: true, direccion: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    */
    return [];
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

    // Obtener saldos por inmueble
    // Temporarily comment out until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    const movimientosPorInmueble = await this.prisma.cuentaCorriente.groupBy({
      by: ['inmuebleId'],
      where: { propietarioId },
      _max: {
        saldoNuevo: true
      }
    });
    */

    // Obtener detalles de inmuebles y saldos
    // Temporarily return mock data until Prisma client is generated
    // TODO: Uncomment when Prisma client is generated
    /*
    const saldosPorInmueble = await Promise.all(
      movimientosPorInmueble.map(async (mov) => {
        if (!mov.inmuebleId) {
          return null;
        }
        
        const inmueble = await this.prisma.inmueble.findUnique({
          where: { id: mov.inmuebleId },
          select: { id: true, direccion: true }
        });

        return {
          inmueble,
          saldo: parseFloat(mov._max.saldoNuevo?.toString() || '0')
        };
      })
    );

    // Obtener últimos movimientos
    const ultimosMovimientos = await this.prisma.cuentaCorriente.findMany({
      where: { propietarioId },
      include: {
        inmueble: {
          select: { id: true, direccion: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      saldoGeneral,
      saldosPorInmueble: saldosPorInmueble.filter(Boolean),
      ultimosMovimientos: ultimosMovimientos.map(mov => ({
        ...mov,
        monto: parseFloat(mov.monto.toString()),
        saldoAnterior: parseFloat(mov.saldoAnterior.toString()),
        saldoNuevo: parseFloat(mov.saldoNuevo.toString())
      }))
    };
    */
    return {
      saldoGeneral,
      saldosPorInmueble: [],
      ultimosMovimientos: []
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
}
