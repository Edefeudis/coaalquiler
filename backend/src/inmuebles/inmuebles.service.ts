import{Injectable,NotFoundException,BadRequestException}from'@nestjs/common';
import{PrismaService}from'../prisma/prisma.service';

@Injectable()
export class InmueblesService{
  constructor(private readonly prisma:PrismaService){}

  async findAll(){
    const inmuebles = await this.prisma.inmueble.findMany({
      include:{
        propietarios:{
          include:{
            propietario:true,
          },
          where:{activo:true},
        },
      },
    });
    
    console.log('🔍 Inmuebles from DB:', inmuebles.map(i => ({
      id: i.id,
      direccion: i.direccion,
      propietariosCount: i.propietarios?.length || 0,
      propietarios: i.propietarios
    })));
    
    return inmuebles;
  }

  async findOne(id:number){
    const inmueble=await this.prisma.inmueble.findUnique({
      where:{id},
      include:{
        propietarios:{
          include:{
            propietario:true,
          },
          where:{activo:true},
        },
      },
    });
    if(!inmueble){
      throw new NotFoundException(`Inmueble ${id} no encontrado`);
    }
    return inmueble;
  }

  async create(data:{direccion:string}){
    return this.prisma.inmueble.create({
      data,
    });
  }

  async update(id:number,data:{direccion:string}){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id}});
    if(!inmueble){
      throw new NotFoundException(`Inmueble ${id} no encontrado`);
    }
    return this.prisma.inmueble.update({
      where:{id},
      data,
    });
  }

  async delete(id:number){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id}});
    if(!inmueble){
      throw new NotFoundException(`Inmueble ${id} no encontrado`);
    }
    return this.prisma.inmueble.delete({where:{id}});
  }

  async agregarPropietario(inmuebleId:number,propietarioId:number,porcentaje:number){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:inmuebleId}});
    if(!inmueble){
      throw new NotFoundException(`Inmueble ${inmuebleId} no encontrado`);
    }

    const propietario=await this.prisma.propietario.findUnique({where:{id:propietarioId}});
    if(!propietario){
      throw new NotFoundException(`Propietario ${propietarioId} no encontrado`);
    }

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

    return this.prisma.inmueblePropietario.create({
      data:{
        inmuebleId,
        propietarioId,
        porcentaje,
      },
    });
  }

  async actualizarPorcentaje(inmuebleId:number,propietarioId:number,nuevoPorcentaje:number){
    const actual=await this.prisma.inmueblePropietario.findUnique({
      where:{
        inmuebleId_propietarioId:{
          inmuebleId,
          propietarioId,
        },
      },
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
      where:{
        inmuebleId_propietarioId:{
          inmuebleId,
          propietarioId,
        },
      },
      data:{porcentaje:nuevoPorcentaje},
    });
  }

  async eliminarPropietario(inmuebleId:number,propietarioId:number){
    const relacion=await this.prisma.inmueblePropietario.findUnique({
      where:{
        inmuebleId_propietarioId:{
          inmuebleId,
          propietarioId,
        },
      },
    });
    if(!relacion){
      throw new NotFoundException(`Relación no encontrada`);
    }
    return this.prisma.inmueblePropietario.delete({
      where:{
        inmuebleId_propietarioId:{
          inmuebleId,
          propietarioId,
        },
      },
    });
  }

  async getPropietarios(inmuebleId:number){
    const inmueble=await this.prisma.inmueble.findUnique({where:{id:inmuebleId}});
    if(!inmueble){
      throw new NotFoundException(`Inmueble ${inmuebleId} no encontrado`);
    }
    return this.prisma.inmueblePropietario.findMany({
      where:{inmuebleId,activo:true},
      include:{
        propietario:true,
      },
    });
  }
}
