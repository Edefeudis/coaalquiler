import{Injectable}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';

interface AuditoriaParams{
  entidad:string;
  entidadId?:number;
  accion:string;
  usuarioId?:number;
  usuarioRol?:string;
  datosPrevios?:string;
  datosNuevos?:string;
}

@Injectable()
export class AuditoriaService{
  constructor(private readonly prisma:PrismaService){}

  async registrar(params:AuditoriaParams){
    return this.prisma.logAuditoria.create({
      data:{
        entidad:params.entidad,
        entidadId:params.entidadId,
        accion:params.accion,
        usuarioId:params.usuarioId,
        usuarioRol:params.usuarioRol,
        datosPrevios:params.datosPrevios,
        datosNuevos:params.datosNuevos,
      },
    });
  }

  async obtenerLogs(params?:{entidad?:string;entidadId?:number;accion?:string;limite?:number;offset?:number}){
    return this.prisma.logAuditoria.findMany({
      where:{
        ...(params?.entidad?{entidad:params.entidad}:{}),
        ...(params?.entidadId?{entidadId:params.entidadId}:{}),
        ...(params?.accion?{accion:params.accion}:{}),
      },
      orderBy:{createdAt:'desc'},
      take:params?.limite??50,
      skip:params?.offset??0,
    });
  }
}
