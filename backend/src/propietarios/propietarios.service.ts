import{Injectable,NotFoundException,BadRequestException}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';

@Injectable()
export class PropietariosService{
  constructor(private readonly prisma:PrismaService){}

  /**
   * Obtiene todos los propietarios
   */
  async findAll(){
    return this.prisma.propietario.findMany({
      include:{inmuebles:{where:{activo:true}}},
    });
  }

  /**
   * Obtiene un propietario por ID
   */
  async findOne(id:number){
    const propietario=await this.prisma.propietario.findUnique({
      where:{id},
      include:{inmuebles:{where:{activo:true},include:{inmueble:true}}},
    });
    if(!propietario)throw new NotFoundException(`Propietario ${id} no encontrado`);
    return propietario;
  }

  /**
   * Obtiene un propietario por email
   */
  async findByEmail(email:string){
    return this.prisma.propietario.findUnique({
      where:{email},
      include:{inmuebles:{where:{activo:true},include:{inmueble:true}}},
    });
  }

  /**
   * Obtiene los inmuebles de un propietario
   */
  async getInmuebles(propietarioId:number){
    return this.prisma.inmueblePropietario.findMany({
      where:{propietarioId,activo:true},
      include:{inmueble:true},
    });
  }

  /**
   * Agrega un nuevo copropietario a un inmueble
   * Verifica que la suma de porcentajes no exceda 100%
   */
  async agregarCopropietario(inmuebleId:number,propietarioId:number,porcentaje:number){
    // Verificar que el inmueble existe
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:inmuebleId}};
    if(!inmueble)throw new NotFoundException(`Inmueble ${inmuebleId} no encontrado`);

    // Verificar que el propietario existe
    const propietario=await this.prisma.propietario.findUnique({where:{id:propietarioId}});
    if(!propietario)throw new NotFoundException(`Propietario ${propietarioId} no encontrado`);

    // Calcular porcentaje actual
    const porcentajeActual=await this.prisma.inmueblePropietario.aggregate({
      where:{inmuebleId,activo:true},
      _sum:{porcentaje:true},
    });

    const totalActual=Number(porcentajeActual._sum.porcentaje||0);
    if(totalActual+porcentaje>100){
      throw new BadRequestException(
        `El porcentaje total excedería 100%. Actual:${totalActual}%, Nuevo:${porcentaje}%`
      );
    }

    // Verificar si ya existe relación
    const existente=await this.prisma.inmueblePropietario.findUnique({
      where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
    });

    if(existente){
      // Si existe pero inactivo, reactivar
      if(!existente.activo){
        return this.prisma.inmueblePropietario.update({
          where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
          data:{activo:true,porcentaje,fechaAlta:new Date()},
        });
      }
      throw new BadRequestException('El propietario ya está asociado a este inmueble');
    }

    return this.prisma.inmueblePropietario.create({
      data:{inmuebleId,propietarioId,porcentaje,activo:true},
    });
  }

  /**
   * Actualiza el porcentaje de un copropietario
   */
  async actualizarPorcentaje(inmuebleId:number,propietarioId:number,nuevoPorcentaje:number){
    const actual=await this.prisma.inmueblePropietario.findUnique({
      where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
    });

    if(!actual)throw new NotFoundException('Relación no encontrada');

    // Calcular porcentaje sin este propietario
    const porcentajeOtros=await this.prisma.inmueblePropietario.aggregate({
      where:{inmuebleId,activo:true,NOT:{propietarioId}},
      _sum:{porcentaje:true},
    });

    const totalOtros=Number(porcentajeOtros._sum.porcentaje||0);
    if(totalOtros+nuevoPorcentaje>100){
      throw new BadRequestException(
        `El porcentaje total excedería 100%. Otros:${totalOtros}%, Nuevo:${nuevoPorcentaje}%`
      );
    }

    return this.prisma.inmueblePropietario.update({
      where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
      data:{porcentaje:nuevoPorcentaje},
    });
  }

  /**
   * Desactiva un copropietario (no elimina para mantener historial)
   */
  async desactivarCopropietario(inmuebleId:number,propietarioId:number){
    const actual=await this.prisma.inmueblePropietario.findUnique({
      where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
    });

    if(!actual)throw new NotFoundException('Relación no encontrada');

    // Verificar que no quede el inmueble sin propietarios activos
    const otros=await this.prisma.inmueblePropietario.findMany({
      where:{inmuebleId,activo:true,NOT:{propietarioId}},
    });

    if(otros.length===0){
      throw new BadRequestException('No se puede desactivar el único propietario activo');
    }

    return this.prisma.inmueblePropietario.update({
      where:{inmuebleId_propietarioId:{inmuebleId,propietarioId}},
      data:{activo:false},
    });
  }

  /**
   * Obtiene los propietarios activos de un inmueble con sus porcentajes
   */
  async getPropietariosInmueble(inmuebleId:number){
    return this.prisma.inmueblePropietario.findMany({
      where:{inmuebleId,activo:true},
      include:{propietario:true},
    });
  }

  /**
   * Crea un nuevo propietario
   */
  async create(data:{nombre:string;email:string}){
    return this.prisma.propietario.create({data});
  }

  /**
   * Verifica que la suma de porcentajes de un inmueble sea exactamente 100%
   */
  async verificarPorcentajes(inmuebleId:number){
    const propietarios=await this.prisma.inmueblePropietario.findMany({
      where:{inmuebleId,activo:true},
    });

    const suma=propietarios.reduce((acc,p)=>acc+Number(p.porcentaje),0);
    return{valido:suma===100,suma,total:propietarios.length};
  }
}