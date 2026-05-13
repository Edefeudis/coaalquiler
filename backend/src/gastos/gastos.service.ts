import{Injectable,NotFoundException}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';
import{AuditoriaService}from'../auditoria/auditoria.service';

@Injectable()
export class GastosService{
  constructor(
    private readonly prisma:PrismaService,
    private readonly auditoria:AuditoriaService,
  ){}

  async crearGasto(data:{inmuebleId:number;concepto:string;monto:number;descripcion?:string;fecha?:Date}){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:data.inmuebleId}});
    if(!inmueble)throw new NotFoundException(`Inmueble ${data.inmuebleId} no encontrado`);

    const gasto=await this.prisma.gastoInmueble.create({
      data:{
        inmuebleId:data.inmuebleId,
        concepto:data.concepto,
        monto:data.monto,
        descripcion:data.descripcion,
        fecha:data.fecha??new Date(),
      },
    });

    await this.auditoria.registrar({
      entidad:'GastoInmueble',
      entidadId:gasto.id,
      accion:'CREATE',
      datosNuevos:JSON.stringify(gasto),
    });

    return gasto;
  }

  async obtenerGastosPorInmueble(inmuebleId:number,desde?:Date,hasta?:Date){
    return this.prisma.gastoInmueble.findMany({
      where:{
        inmuebleId,
        ...(desde||hasta?{fecha:{...(desde?{gte:desde}:{}),...(hasta?{lte:hasta}:{})}}:{}),
      },
      include:{
        inmueble:{
          include:{
            propietarios:{
              where:{activo:true},
              include:{propietario:true}
            }
          }
        }
      },
      orderBy:{fecha:'desc'},
    });
  }

  async obtenerGasto(id:number){
    const gasto=await this.prisma.gastoInmueble.findUnique({where:{id}});
    if(!gasto)throw new NotFoundException(`Gasto ${id} no encontrado`);
    return gasto;
  }

  async actualizarGasto(id:number,data:{concepto?:string;monto?:number;descripcion?:string;fecha?:string}){
    const gasto=await this.obtenerGasto(id);
    const actualizado=await this.prisma.gastoInmueble.update({
      where:{id},
      data:{
        ...(data.concepto!==undefined&&{concepto:data.concepto}),
        ...(data.monto!==undefined&&{monto:data.monto}),
        ...(data.descripcion!==undefined&&{descripcion:data.descripcion}),
        ...(data.fecha!==undefined&&{fecha:new Date(data.fecha)}),
      },
    });

    await this.auditoria.registrar({
      entidad:'GastoInmueble',
      entidadId:id,
      accion:'UPDATE',
      datosPrevios:JSON.stringify(gasto),
      datosNuevos:JSON.stringify(actualizado),
    });

    return actualizado;
  }

  async eliminarGasto(id:number){
    const gasto=await this.obtenerGasto(id);
    await this.auditoria.registrar({
      entidad:'GastoInmueble',
      entidadId:id,
      accion:'DELETE',
      datosPrevios:JSON.stringify(gasto),
    });
    return this.prisma.gastoInmueble.delete({where:{id}});
  }
}
