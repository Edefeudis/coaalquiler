import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CuentaCorrienteService } from './cuenta-corriente.service';

@Injectable()
export class CobrosService{
  constructor(
    private readonly prisma:PrismaService,
    private readonly auditoria:AuditoriaService,
    private readonly cuentaCorrienteService: CuentaCorrienteService,
  ){}

  async crearCobro(data:{inmuebleId:number;periodo:string;montoBruto:number;fechaCobro?:Date}){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:data.inmuebleId}});
    if(!inmueble)throw new NotFoundException(`Inmueble ${data.inmuebleId} no encontrado`);

    // Calcular gastos del período
    const gastosDelPeriodo = await this.prisma.gastoInmueble.findMany({
      where: {
        inmuebleId: data.inmuebleId,
        fecha: {
          gte: new Date(data.periodo + '-01'),
          lt: new Date(data.periodo + '-31')
        }
      }
    });

    const gastosTotal = gastosDelPeriodo.reduce((sum, gasto) => sum + parseFloat(gasto.monto.toString()), 0);

    const cobro=await this.prisma.cobroAlquiler.create({
      data:{
        inmuebleId:data.inmuebleId,
        periodo:data.periodo,
        montoBruto:data.montoBruto,
        montoNeto:data.montoBruto - gastosTotal,
        gastosTotal: gastosTotal,
        fechaCobro:data.fechaCobro??new Date(),
      },
    });

    const variacion = await this.calcularVariacionPorcentual(data.inmuebleId, data.montoBruto);

    await this.auditoria.registrar({
      entidad:'CobroAlquiler',
      entidadId:cobro.id,
      accion:'CREATE',
      datosNuevos:JSON.stringify(cobro),
    });

    // Integrar con cuenta corriente - distribuir montos a propietarios
    await this.distribuirMontoCuentaCorriente(cobro);

    return cobro;
  }

  async distribuirMontoCuentaCorriente(cobro: any) {
    try {
      // Obtener las distribuciones del cobro
      const distribuciones = await this.prisma.distribucionCobro.findMany({
        where: { cobroId: cobro.id },
        include: {
          propietario: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });

      // Distribuir el monto neto a cada propietario según su porcentaje
      for (const distribucion of distribuciones) {
        const porcentaje = parseFloat(distribucion.porcentaje.toString());
        const montoDistribucion = (cobro.montoNeto * porcentaje) / 100;

        // Registrar movimiento en cuenta corriente
        await this.cuentaCorrienteService.registrarMovimiento({
          propietarioId: distribucion.propietarioId,
          inmuebleId: cobro.inmuebleId,
          tipoMovimiento: 'DISTRIBUCION',
          monto: montoDistribucion,
          referencia: `Cobro ${cobro.periodo}`,
          referenciaId: cobro.id,
          descripcion: `Distribución del cobro del período ${cobro.periodo} - ${porcentaje}%`
        });
      }

      console.log(`Distribuido ${cobro.montoNeto} entre ${distribuciones.length} propietarios`);
    } catch (error) {
      console.error('Error al distribuir en cuenta corriente:', error);
      // No lanzar error para no interrumpir el flujo del cobro
    }
  }

  async obtenerUltimoCobroPorInmueble(inmuebleId: number) {
    const ultimoCobro = await this.prisma.cobroAlquiler.findFirst({
      where: { inmuebleId },
      orderBy: { fechaCobro: 'desc' }
    });

    return ultimoCobro;
  }

  async obtenerCobrosPorInmueble(inmuebleId:number){
    return this.prisma.cobroAlquiler.findMany({
      where:{inmuebleId},
      include:{distribuciones:{include:{propietario:{select:{id:true,nombre:true,email:true}}}},factura:true},
      orderBy:{fechaCobro:'desc'},
    });
  }

  async obtenerCobrosPorInmuebleConFiltros(inmuebleId:number, desde?:string, hasta?:string){
    const whereClause:any = {inmuebleId};
    
    if (desde) {
      whereClause.fechaCobro = {gte: new Date(desde)};
    }
    
    if (hasta) {
      whereClause.fechaCobro = {...whereClause.fechaCobro, lte: new Date(hasta + 'T23:59:59.999')};
    }
    
    return this.prisma.cobroAlquiler.findMany({
      where: whereClause,
      include:{distribuciones:{include:{propietario:{select:{id:true,nombre:true,email:true}}}},factura:true,inmueble:true},
      orderBy:{fechaCobro:'desc'},
    });
  }

  async calcularVariacionPorcentual(inmuebleId: number, montoActual: number) {
    const ultimoCobro = await this.obtenerUltimoCobroPorInmueble(inmuebleId);
    
    if (!ultimoCobro) {
      return { variacion: 0 };
    }
    
    const montoAnterior = typeof ultimoCobro.montoBruto === 'number' 
      ? ultimoCobro.montoBruto 
      : parseFloat(ultimoCobro.montoBruto.toString());
    
    const variacion = ((montoActual - montoAnterior) / montoAnterior) * 100;
    
    return { 
      variacion: parseFloat(variacion.toFixed(2)),
      montoAnterior: montoAnterior,
      montoActual: montoActual
    };
  }

  async generarPDFCobros(inmuebleId: number, desde?: string, hasta?: string): Promise<Buffer> {
    const whereClause: any = { inmuebleId };
    
    if (desde) {
      whereClause.fechaCobro = { gte: new Date(desde) };
    }
    
    if (hasta) {
      whereClause.fechaCobro = { ...whereClause.fechaCobro, lte: new Date(hasta + 'T23:59:59.999') };
    }

    const cobros = await this.prisma.cobroAlquiler.findMany({
      where: whereClause,
      include: {
        inmueble: true,
        distribuciones: {
          include: {
            propietario: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }
      },
      orderBy: { fechaCobro: 'desc' }
    });

    // Generar PDF simple (texto plano por ahora)
    let pdfContent = `REPORTE DE COBROS - INMUEBLE ${inmuebleId}\n`;
    pdfContent += `=====================================\n\n`;
    
    if (desde || hasta) {
      pdfContent += `Período: ${desde || 'Inicio'} - ${hasta || 'Actual'}\n\n`;
    }

    let totalBruto = 0;
    let totalNeto = 0;
    let totalGastos = 0;

    for (const cobro of cobros) {
      pdfContent += `Período: ${cobro.periodo}\n`;
      pdfContent += `Fecha: ${new Date(cobro.fechaCobro).toLocaleDateString('es-AR')}\n`;
      pdfContent += `Monto Bruto: $${cobro.montoBruto}\n`;
      pdfContent += `Gastos: $${cobro.gastosTotal}\n`;
      pdfContent += `Monto Neto: $${cobro.montoNeto}\n`;
      
      totalBruto += parseFloat(cobro.montoBruto.toString());
      totalNeto += parseFloat(cobro.montoNeto.toString());
      totalGastos += parseFloat(cobro.gastosTotal.toString());

      if (cobro.distribuciones && cobro.distribuciones.length > 0) {
        pdfContent += `Distribución:\n`;
        for (const dist of cobro.distribuciones) {
          pdfContent += `  - ${dist.propietario.nombre}: $${dist.montoNeto}\n`;
        }
      }
      
      pdfContent += '\n-------------------------------------\n\n';
    }

    pdfContent += `RESUMEN\n`;
    pdfContent += `=====================================\n`;
    pdfContent += `Total Bruto: $${totalBruto.toFixed(2)}\n`;
    pdfContent += `Total Gastos: $${totalGastos.toFixed(2)}\n`;
    pdfContent += `Total Neto: $${totalNeto.toFixed(2)}\n`;
    pdfContent += `\nGenerado el: ${new Date().toLocaleDateString('es-AR')}\n`;

    // Convertir a buffer (simulación simple)
    return Buffer.from(pdfContent, 'utf-8');
  }

  async obtenerCobro(id:number){
    const cobro=await this.prisma.cobroAlquiler.findUnique({
      where:{id},
      include:{distribuciones:{include:{propietario:true}},factura:true,inmueble:true},
    });
    if(!cobro)throw new NotFoundException(`Cobro ${id} no encontrado`);
    return cobro;
  }
}
