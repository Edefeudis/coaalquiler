import{Controller,Get,Post,Put,Delete,Body,Param,ParseIntPipe}from'@nestjs/common';
import{PropietariosService}from'./propietarios.service';

@Controller('api/propietarios')
export class PropietariosController{
  constructor(private readonly propietariosService:PropietariosService){}

  @Get()
  findAll(){
    return this.propietariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id',ParseIntPipe)id:number){
    return this.propietariosService.findOne(id);
  }

  @Get('email/:email')
  findByEmail(@Param('email')email:string){
    return this.propietariosService.findByEmail(email);
  }

  @Get(':id/inmuebles')
  getInmuebles(@Param('id',ParseIntPipe)id:number){
    return this.propietariosService.getInmuebles(id);
  }

  @Post()
  create(@Body()data:{nombre:string;email:string}){
    return this.propietariosService.create(data);
  }

  @Post(':inmuebleId/copropietario/:propietarioId')
  agregarCopropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.propietariosService.agregarCopropietario(inmuebleId,propietarioId,body.porcentaje);
  }

  @Put(':inmuebleId/copropietario/:propietarioId')
  actualizarPorcentaje(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
    @Body()body:{porcentaje:number},
  ){
    return this.propietariosService.actualizarPorcentaje(inmuebleId,propietarioId,body.porcentaje);
  }

  @Delete(':inmuebleId/copropietario/:propietarioId')
  desactivarCopropietario(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Param('propietarioId',ParseIntPipe)propietarioId:number,
  ){
    return this.propietariosService.desactivarCopropietario(inmuebleId,propietarioId);
  }

  @Get('inmueble/:inmuebleId/propietarios')
  getPropietariosInmueble(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.propietariosService.getPropietariosInmueble(inmuebleId);
  }

  @Get('inmueble/:inmuebleId/verificar-porcentajes')
  verificarPorcentajes(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.propietariosService.verificarPorcentajes(inmuebleId);
  }
}