import{Controller,Get,Post,Put,Delete,Body,Param,ParseIntPipe,UseGuards,Query}from'@nestjs/common';
import{GastosService}from'./gastos.service';
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard';
import{RolesGuard}from'../auth/guards/roles.guard';
import{PropietarioGuard}from'../auth/guards/propietario.guard';
import{Roles}from'../auth/decorators/roles.decorator';
import{Rol}from'../auth/auth.service';

@Controller('gastos')
@UseGuards(JwtAuthGuard,RolesGuard,PropietarioGuard)
export class GastosController{
  constructor(private readonly gastosService:GastosService){}

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post()
  crearGasto(@Body()body:{inmuebleId:number;concepto:string;monto:number;descripcion?:string;fecha?:string}){
    return this.gastosService.crearGasto({
      ...body,
      fecha:body.fecha?new Date(body.fecha):undefined,
    });
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId')
  obtenerGastos(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Query('desde')desde?:string,
    @Query('hasta')hasta?:string,
  ){
    return this.gastosService.obtenerGastosPorInmueble(
      inmuebleId,
      desde?new Date(desde):undefined,
      hasta?new Date(hasta):undefined,
    );
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get(':id')
  obtenerGasto(@Param('id',ParseIntPipe)id:number){
    return this.gastosService.obtenerGasto(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Put(':id')
  actualizarGasto(@Param('id',ParseIntPipe)id:number,@Body()body:{concepto?:string;monto?:number;descripcion?:string;fecha?:string}){
    return this.gastosService.actualizarGasto(id,body);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Delete(':id')
  eliminarGasto(@Param('id',ParseIntPipe)id:number){
    return this.gastosService.eliminarGasto(id);
  }
}
