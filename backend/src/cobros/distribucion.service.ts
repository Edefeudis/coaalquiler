import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class DistribucionService{
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ){}

  /**
   * Calcula y aplica la distribución proporcional de un cobro entre copropietarios,
   * descontando proporcionalmente los gastos del inmueble.
   */
  async distribuirCobro(cobroId: number) {
    const cobro = await this.prisma.cobroAlquiler.findUnique({
      where: { id: cobroId },
      include: { 
        inmueble: { 
          include: { 
            propietarios: { 
              where: { activo: true }, 
              include: { propietario: true }
            }
          }
        }, 
        distribuciones: true 
      }
    });

    if(!cobro)throw new NotFoundException(`Cobro ${cobroId} no encontrado`);
    if(cobro.distribuciones.length>0)throw new BadRequestException('El cobro ya fue distribuido');

    const propietarios=cobro.inmueble.propietarios;
    if(propietarios.length===0)throw new BadRequestException('El inmueble no tiene propietarios activos');

    // Obtener gastos del periodo
    const[periodoIni,periodoFin]=this.rangoPeriodo(cobro.periodo);
    const gastos=await this.prisma.gastoInmueble.findMany({
      where:{inmuebleId:cobro.inmuebleId,fecha:{gte:periodoIni,lte:periodoFin}},
    });
    const totalGastos=gastos.reduce((sum,g)=>sum+Number(g.monto),0);

    // Validar que suma de porcentajes sea 100
    const totalPorcentaje=propietarios.reduce((sum,p)=>sum+Number(p.porcentaje),0);
    if(Math.abs(totalPorcentaje-100)>0.01){
      throw new BadRequestException(`Porcentajes no suman 100%: ${totalPorcentaje}`);
    }

    const montoBruto=Number(cobro.montoBruto);
    const montoNetoGlobal=Math.max(0,montoBruto-totalGastos);

    const distribuciones = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const rel of propietarios) {
        const porcentaje = Number(rel.porcentaje);
        const montoAsignado = Number((montoBruto * porcentaje / 100).toFixed(2));
        const gastosDeducidos = Number((totalGastos * porcentaje / 100).toFixed(2));
        const montoNeto = Number((montoNetoGlobal * porcentaje / 100).toFixed(2));

        const dist=await tx.distribucionCobro.create({
          data:{
            cobroId,
            propietarioId:rel.propietarioId,
            montoAsignado,
            porcentaje,
            gastosDeducidos,
            montoNeto,
          },
        });
        results.push(dist);
      }

      // Ajustar redondeo: último propietario absorbe diferencia de centavos
      const sumaAsignada = results.reduce((s, r) => s + Number(r.montoAsignado), 0);
      const diff = Number((montoBruto - sumaAsignada).toFixed(2));
      if (diff !== 0 && results.length > 0) {
        const last = results[results.length - 1];
        await tx.distribucionCobro.update({
          where: { id: last.id },
          data: { montoAsignado: { increment: diff } },
        });
      }

      await tx.cobroAlquiler.update({
        where: { id: cobroId },
        data: { montoNeto: montoNetoGlobal, gastosTotal: totalGastos, estado: 'DISTRIBUIDO' },
      });

      return results;
    });

    await this.auditoria.registrar({
      entidad:'CobroAlquiler',
      entidadId:cobroId,
      accion:'DISTRIBUCION',
      datosNuevos:JSON.stringify({gastosTotal:totalGastos,propietarios:propietarios.length}),
    });

    return{distribuciones,gastosTotal:totalGastos,montoNeto:montoNetoGlobal};
  }

  async obtenerDistribucionPorCobro(cobroId: number) {
    return this.prisma.distribucionCobro.findMany({
      where: { cobroId },
      include: { propietario: { select: { id: true, nombre: true, email: true } } },
    });
  }

  async obtenerDistribucionesPorPropietario(propietarioId: number) {
    return this.prisma.distribucionCobro.findMany({
      where: { propietarioId },
      include: { 
        propietario: {
          select: { id: true, nombre: true, email: true }
        },
        cobro: { 
          include: { 
            inmueble: { 
              select: { id: true, direccion: true } 
            } 
          } 
        } 
      },
      orderBy: { cobro: { fechaCobro: 'desc' } },
    });
  }

  private rangoPeriodo(periodo: string): [Date, Date] {
    const [year, month] = periodo.split('-').map(Number);
    const ini = new Date(year, month - 1, 1, 0, 0, 0);
    const fin = new Date(year, month, 0, 23, 59, 59);
    return [ini, fin];
  }
}
