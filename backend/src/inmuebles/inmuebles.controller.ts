import{Controller,Get,Post,Put,Delete,Body,Param,ParseIntPipe,UseGuards}from'@nestjs/common';
import{InmueblesService}from'./inmuebles.service';
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard';
import{RolesGuard}from'../auth/guards/roles.guard';
import{Roles}from'../auth/decorators/roles.decorator';
import{Rol}from'../auth/auth.service';

@Controller('inmuebles')
@UseGuards(JwtAuthGuard,RolesGuard)
export class InmueblesController{
  constructor(private readonly inmueblesService:InmueblesService){}

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Get()
  findAll(){
    return this.inmueblesService.findAll();
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Get(':id')
  findOne(@Param('id',ParseIntPipe)id:number){
    return this.inmueblesService.findOne(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post()
  create(@Body()data:{direccion:string}){
    return this.inmueblesService.create(data);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Put(':id')
  update(@Param('id',ParseIntPipe)id:number,@Body()data:{direccion:string}){
    return this.inmueblesService.update(id,data);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Delete(':id')
  delete(@Param('id',ParseIntPipe)id:number){
    return this.inmueblesService.delete(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Get(':id/propietarios')
  getPropietarios(@Param('id',ParseIntPipe)id:number){
    return this.inmueblesService.getPropietarios(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post(':inmuebleId/propietario/:propietarioId')
  agregarPropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.inmueblesService.agregarPropietario(inmuebleId,propietarioId,body.porcentaje);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Put(':inmuebleId/propietario/:propietarioId')
  actualizarPorcentaje(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.inmueblesService.actualizarPorcentaje(inmuebleId,propietarioId,body.porcentaje);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Delete(':inmuebleId/propietario/:propietarioId')
  eliminarPropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
  ){
    return this.inmueblesService.eliminarPropietario(inmuebleId,propietarioId);
  }
}
