import{Injectable,Logger,NotFoundException}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';
import{ArcaService}from'./arca.service';
import{AuditoriaService}from'../auditoria/auditoria.service';

@Injectable()
export class FacturacionService{
  private readonly logger=new Logger(FacturacionService.name);
  private readonly maxRetries=3;

  constructor(
    private readonly prisma:PrismaService,
    private readonly arca:ArcaService,
    private readonly auditoria:AuditoriaService,
  ){}

  async generarFactura(cobroId:number){
    const cobro=await this.prisma.cobroAlquiler.findUnique({
      where:{id:cobroId},
      include:{inmueble:true},
    });
    if(!cobro)throw new NotFoundException(`Cobro ${cobroId} no encontrado`);

    // Crear registro pendiente
    let factura=await this.prisma.facturaElectronica.create({
      data:{cobroId,estado:'PENDIENTE'},
    });

    // Intentar emitir
    for(let intento=1;intento<=this.maxRetries;intento++){
      this.logger.log(`Intento ${intento} para cobro ${cobroId}`);

      const response=await this.arca.emitirFactura({
        puntoVenta:1,
        tipoComprobante:11, // Factura C (Monotributo)
        concepto:1, // Productos
        docTipo:99, // Consumidor final
        docNro:0,
        importeTotal:Number(cobro.montoBruto),
        moneda:'PES',
        cotizacion:1,
      });

      if(response.cae){
        factura=await this.prisma.facturaElectronica.update({
          where:{id:factura.id},
          data:{
            cae:response.cae,
            numeroFactura:response.numero??undefined,
            estado:'APROBADA',
            intentos:intento,
          },
        });

        await this.auditoria.registrar({
          entidad:'FacturaElectronica',
          entidadId:factura.id,
          accion:'FACTURACION',
          datosNuevos:JSON.stringify({cae:response.cae,cobroId}),
        });

        await this.prisma.cobroAlquiler.update({
          where:{id:cobroId},
          data:{estado:'FACTURADO'},
        });

        return factura;
      }

      // Error: guardar y reintentar
      await this.prisma.facturaElectronica.update({
        where:{id:factura.id},
        data:{
          intentos:intento,
          ultimoError:response.errores?.join('; ')??'Error',
          estado:intento===this.maxRetries?'ERROR':'PENDIENTE',
        },
      });

      if(intento<this.maxRetries){
        await this.delay(2000*intento);
      }
    }

    return factura;
  }

  async reintentarFacturasPendientes(){
    const pendientes=await this.prisma.facturaElectronica.findMany({
      where:{estado:{in:['PENDIENTE','ERROR']},intentos:{lt:this.maxRetries}},
      include:{cobro:true},
    });

    this.logger.log(`Reintentando ${pendientes.length} facturas pendientes`);
    const results=[];
    for(const f of pendientes){
      const result=await this.generarFactura(f.cobroId);
      results.push(result);
    }
    return results;
  }

  async obtenerFacturaPorCobro(cobroId:number){
    return this.prisma.facturaElectronica.findUnique({where:{cobroId}});
  }

  private delay(ms:number):Promise<void>{
    return new Promise(r=>setTimeout(r,ms));
  }
}
