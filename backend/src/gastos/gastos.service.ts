import{Injectable,NotFoundException,BadRequestException}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';
import{AuditoriaService}from'../auditoria/auditoria.service';
import{randomUUID}from'crypto';

/** CAJA (por defecto) o FONDO (fondo de reserva común). */
function normalizarPagadoCon(v?:string){
  return v==='FONDO'?'FONDO':'CAJA';
}

/** Reparte un total en n partes iguales en centavos; los centavos sobrantes van a las primeras partes. */
function repartir(total:number,n:number){
  const cent=Math.round(total*100),base=Math.floor(cent/n),resto=cent-base*n;
  return Array.from({length:n},(_,i)=>(base+(i<resto?1:0))/100);
}

@Injectable()
export class GastosService{
  constructor(
    private readonly prisma:PrismaService,
    private readonly auditoria:AuditoriaService,
  ){}

  async crearGasto(data:{inmuebleId:number;concepto:string;monto:number;descripcion?:string;fecha?:Date;pagadoCon?:string}){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:data.inmuebleId}});
    if(!inmueble)throw new NotFoundException(`Inmueble ${data.inmuebleId} no encontrado`);

    const gasto=await this.prisma.gastoInmueble.create({
      data:{
        inmuebleId:data.inmuebleId,
        concepto:data.concepto,
        monto:data.monto,
        descripcion:data.descripcion,
        fecha:data.fecha??new Date(),
        pagadoCon:normalizarPagadoCon(data.pagadoCon),
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

  /**
   * Carga un mismo gasto en varios inmuebles a la vez.
   * modo DIVIDIR: el monto total se reparte en partes iguales (los centavos sobrantes van al primero).
   * modo REPETIR: cada inmueble recibe el monto completo.
   */
  async crearGastoMultiple(data:{inmuebleIds:number[];concepto:string;monto:number;modo:'DIVIDIR'|'REPETIR';descripcion?:string;fecha?:Date;pagadoCon?:string}){
    const ids=[...new Set(data.inmuebleIds)];
    if(ids.length===0)throw new BadRequestException('Seleccione al menos un inmueble');
    if(!(data.monto>0))throw new BadRequestException('El monto debe ser mayor a 0');
    if(!data.concepto?.trim())throw new BadRequestException('El concepto es obligatorio');

    const existentes=await this.prisma.inmueble.findMany({where:{id:{in:ids}},select:{id:true}});
    if(existentes.length!==ids.length){
      const faltan=ids.filter(id=>!existentes.some(e=>e.id===id));
      throw new NotFoundException(`Inmuebles no encontrados: ${faltan.join(', ')}`);
    }

    // Trabajar en centavos para que la suma de las partes dé exactamente el total
    const totalCent=Math.round(data.monto*100);
    const montos=ids.map((_,i)=>{
      if(data.modo==='REPETIR')return totalCent/100;
      const base=Math.floor(totalCent/ids.length);
      const resto=totalCent-base*ids.length;
      return (base+(i<resto?1:0))/100;
    });

    const fecha=data.fecha??new Date();
    const descripcion=data.modo==='DIVIDIR'&&ids.length>1
      ?[data.descripcion,`Gasto común dividido entre ${ids.length} inmuebles (total ${data.monto.toFixed(2)})`].filter(Boolean).join(' · ')
      :data.descripcion;

    const grupoId=ids.length>1?randomUUID():null;
    const gastos=await this.prisma.$transaction(
      ids.map((inmuebleId,i)=>this.prisma.gastoInmueble.create({
        data:{inmuebleId,concepto:data.concepto,monto:montos[i],descripcion,fecha,grupoId,pagadoCon:normalizarPagadoCon(data.pagadoCon)},
      })),
    );

    for(const gasto of gastos){
      await this.auditoria.registrar({
        entidad:'GastoInmueble',
        entidadId:gasto.id,
        accion:'CREATE',
        datosNuevos:JSON.stringify({...gasto,cargaMultiple:{modo:data.modo,inmuebles:ids.length}}),
      });
    }

    return gastos;
  }

  async obtenerTodosLosGastos(desde?:Date,hasta?:Date){
    return this.prisma.gastoInmueble.findMany({
      where:desde||hasta?{fecha:{...(desde?{gte:desde}:{}),...(hasta?{lte:hasta}:{})}}:{},
      include:{
        inmueble:{
          include:{
            propietarios:{where:{activo:true},include:{propietario:true}}
          }
        }
      },
      orderBy:{fecha:'desc'},
    });
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

  async actualizarGasto(id:number,data:{concepto?:string;monto?:number;descripcion?:string;fecha?:string;pagadoCon?:string}){
    const gasto=await this.obtenerGasto(id);
    const actualizado=await this.prisma.gastoInmueble.update({
      where:{id},
      data:{
        ...(data.concepto!==undefined&&{concepto:data.concepto}),
        ...(data.monto!==undefined&&{monto:Number(data.monto)}),
        ...(data.descripcion!==undefined&&{descripcion:data.descripcion}),
        ...(data.fecha!==undefined&&{fecha:new Date(data.fecha)}),
        ...(data.pagadoCon!==undefined&&{pagadoCon:normalizarPagadoCon(data.pagadoCon)}),
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

  private async obtenerGrupo(grupoId:string){
    const partes=await this.prisma.gastoInmueble.findMany({where:{grupoId},orderBy:{id:'asc'}});
    if(partes.length===0)throw new NotFoundException(`Gasto común ${grupoId} no encontrado`);
    return partes;
  }

  /** Edita todas las partes de un gasto común. Si cambia el total, se vuelve a repartir en partes iguales. */
  async actualizarGrupo(grupoId:string,data:{concepto?:string;montoTotal?:number;descripcion?:string;fecha?:string;pagadoCon?:string}){
    const partes=await this.obtenerGrupo(grupoId);
    if(data.montoTotal!==undefined&&!(Number(data.montoTotal)>0))throw new BadRequestException('El monto debe ser mayor a 0');
    const montos=data.montoTotal!==undefined?repartir(Number(data.montoTotal),partes.length):null;

    // La nota automática "Gasto común dividido entre N inmuebles (total X)" se regenera con el total vigente
    const NOTA=/\s*·?\s*Gasto común dividido entre \d+ inmuebles \(total [\d.]+\)/;
    const descActual=partes[0].descripcion||'';
    const tieneNota=NOTA.test(descActual);
    const base=(data.descripcion!==undefined?data.descripcion:descActual).replace(NOTA,'').trim();
    const total=data.montoTotal!==undefined?Number(data.montoTotal):partes.reduce((s,p)=>s+Number(p.monto),0);
    const descripcion=tieneNota
      ?[base,`Gasto común dividido entre ${partes.length} inmuebles (total ${total.toFixed(2)})`].filter(Boolean).join(' · ')
      :base||null;

    const actualizados=await this.prisma.$transaction(partes.map((p,i)=>this.prisma.gastoInmueble.update({
      where:{id:p.id},
      data:{
        ...(data.concepto!==undefined&&{concepto:data.concepto}),
        descripcion,
        ...(data.fecha!==undefined&&{fecha:new Date(data.fecha)}),
        ...(montos&&{monto:montos[i]}),
        ...(data.pagadoCon!==undefined&&{pagadoCon:normalizarPagadoCon(data.pagadoCon)}),
      },
    })));

    for(let i=0;i<partes.length;i++){
      await this.auditoria.registrar({
        entidad:'GastoInmueble',entidadId:partes[i].id,accion:'UPDATE',
        datosPrevios:JSON.stringify(partes[i]),datosNuevos:JSON.stringify({...actualizados[i],edicionGrupo:grupoId}),
      });
    }
    return actualizados;
  }

  async eliminarGrupo(grupoId:string){
    const partes=await this.obtenerGrupo(grupoId);
    for(const p of partes){
      await this.auditoria.registrar({
        entidad:'GastoInmueble',entidadId:p.id,accion:'DELETE',
        datosPrevios:JSON.stringify({...p,eliminacionGrupo:grupoId}),
      });
    }
    await this.prisma.gastoInmueble.deleteMany({where:{grupoId}});
    return{eliminados:partes.length};
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
