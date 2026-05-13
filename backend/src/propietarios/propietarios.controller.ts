import{Controller,Get,Post,Put,Delete,Body,Param,ParseIntPipe,UseGuards,ForbiddenException}from'@nestjs/common';
import{PropietariosService}from'./propietarios.service';
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard';
import{RolesGuard}from'../auth/guards/roles.guard';
import{PropietarioGuard}from'../auth/guards/propietario.guard';
import{Roles}from'../auth/decorators/roles.decorator';
import{CurrentUser}from'../auth/decorators/current-user.decorator';
import{Rol}from'../auth/auth.service';

@Controller('propietarios')
@UseGuards(JwtAuthGuard,RolesGuard,PropietarioGuard)
export class PropietariosController{
  constructor(private readonly propietariosService:PropietariosService){}

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Get()
  findAll(){
    return this.propietariosService.findAll();
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get(':id')
  findOne(@Param('id',ParseIntPipe)id:number,@CurrentUser()user:any){
    if(user.rol===Rol.PROPIETARIO&&user.sub!==id){
      throw new ForbiddenException('No puede acceder a datos de otro propietario');
    }
    return this.propietariosService.findOne(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Get('email/:email')
  findByEmail(@Param('email')email:string){
    return this.propietariosService.findByEmail(email);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get(':id/inmuebles')
  getInmuebles(@Param('id',ParseIntPipe)id:number,@CurrentUser()user:any){
    if(user.rol===Rol.PROPIETARIO&&user.sub!==id){
      throw new ForbiddenException('No puede acceder a datos de otro propietario');
    }
    return this.propietariosService.getInmuebles(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post()
  create(@Body()data:{nombre:string;email:string}){
    return this.propietariosService.create(data);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post(':inmuebleId/copropietario/:propietarioId')
  agregarCopropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.propietariosService.agregarCopropietario(inmuebleId,propietarioId,body.porcentaje);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Put(':inmuebleId/copropietario/:propietarioId')
  actualizarPorcentaje(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.propietariosService.actualizarPorcentaje(inmuebleId,propietarioId,body.porcentaje);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Delete(':inmuebleId/copropietario/:propietarioId')
  desactivarCopropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
  ){
    return this.propietariosService.desactivarCopropietario(inmuebleId,propietarioId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/propietarios')
  getPropietariosInmueble(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.propietariosService.getPropietariosInmueble(inmuebleId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/verificar-porcentajes')
  verificarPorcentajes(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.propietariosService.verificarPorcentajes(inmuebleId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Delete(':id')
  delete(@Param('id',ParseIntPipe)id:number){
    return this.propietariosService.delete(id);
  }
}