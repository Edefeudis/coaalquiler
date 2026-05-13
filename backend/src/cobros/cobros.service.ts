import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { DistribucionService } from './distribucion.service';

@Injectable()
export class CobrosService{
  constructor(
    private readonly prisma:PrismaService,
    private readonly auditoria:AuditoriaService,
    private readonly distribucionService: DistribucionService,
  ){}

  async crearCobro(data:{inmuebleId:number;periodo:string;montoBruto:number;fechaCobro?:Date}){
    console.log('crearCobro llamado con:', data);

    const inmueble=await this.prisma.inmueble.findUnique({where:{id:data.inmuebleId}});
    if(!inmueble)throw new NotFoundException(`Inmueble ${data.inmuebleId} no encontrado`);

    // Verificar propietarios activos
    const propietarios = await this.prisma.inmueblePropietario.findMany({
      where: { inmuebleId: data.inmuebleId, activo: true },
    });
    console.log('Propietarios encontrados:', propietarios.length);
    if (propietarios.length === 0) {
      throw new BadRequestException('El inmueble no tiene propietarios activos');
    }

    // Verificar que los porcentajes sumen 100
    const totalPorcentaje = propietarios.reduce((sum, p) => sum + Number(p.porcentaje), 0);
    console.log('Total porcentaje:', totalPorcentaje);
    if (Math.abs(totalPorcentaje - 100) > 0.01) {
      throw new BadRequestException(`Los porcentajes de propietarios no suman 100%: ${totalPorcentaje}%`);
    }

    const cobro=await this.prisma.cobroAlquiler.create({
      data:{
        inmuebleId:data.inmuebleId,
        periodo:data.periodo,
        montoBruto:data.montoBruto,
        montoNeto: "0",
        gastosTotal: "0",
        fechaCobro:data.fechaCobro??new Date(),
      },
    });
    console.log('Cobro creado:', cobro.id);

    await this.auditoria.registrar({
      entidad:'CobroAlquiler',
      entidadId:cobro.id,
      accion:'CREATE',
      datosNuevos:JSON.stringify(cobro),
    });

    // Distribuir el cobro entre propietarios
    console.log('Iniciando distribución...');
    await this.distribucionService.distribuirCobro(cobro.id);
    console.log('Distribución completada');

    // Retornar el cobro actualizado
    return {
      ...cobro,
      distribuciones: await this.prisma.distribucionCobro.findMany({
        where: { cobroId: cobro.id },
        include: { propietario: true }
      })
    };
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
      include:{distribuciones:{include:{propietario:{select:{id:true,nombre:true,email:true}}}},inmueble:true},
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
      include:{distribuciones:{include:{propietario:{select:{id:true,nombre:true,email:true}}}},inmueble:true},
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
      include:{distribuciones:{include:{propietario:true}}},
    });
    if(!cobro)throw new NotFoundException(`Cobro ${id} no encontrado`);
    return cobro;
  }
}
