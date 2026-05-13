import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Query, Res } from '@nestjs/common';
import { CobrosService } from './cobros.service';
import { DistribucionService } from './distribucion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/auth.service';

@Controller('cobros')
@UseGuards(JwtAuthGuard,RolesGuard)
export class CobrosController{
  constructor(
    private readonly cobrosService: CobrosService,
    private readonly distribucionService: DistribucionService,
  ){}

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post()
  crearCobro(@Body()body:{inmuebleId:number;periodo:string;montoBruto:number;fechaCobro?:Date}){
    return this.cobrosService.crearCobro(body);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/filtrados')
  obtenerCobrosPorInmuebleConFiltros(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Query('desde') desde?:string,
    @Query('hasta') hasta?:string
  ){
    return this.cobrosService.obtenerCobrosPorInmuebleConFiltros(inmuebleId, desde, hasta);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/variacion')
  calcularVariacion(@Param('inmuebleId',ParseIntPipe)inmuebleId:number, @Query('montoActual') montoActual:number){
    return this.cobrosService.calcularVariacionPorcentual(inmuebleId, montoActual);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/ultimo-cobro')
  obtenerUltimoCobro(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.cobrosService.obtenerUltimoCobroPorInmueble(inmuebleId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId')
  obtenerCobros(@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.cobrosService.obtenerCobrosPorInmueble(inmuebleId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get(':id')
  obtenerCobro(@Param('id',ParseIntPipe)id:number){
    return this.cobrosService.obtenerCobro(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post(':id/distribuir')
  distribuirCobro(@Param('id',ParseIntPipe)id:number){
    return this.distribucionService.distribuirCobro(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get(':id/distribucion')
  obtenerDistribucion(@Param('id',ParseIntPipe)id:number){
    return this.distribucionService.obtenerDistribucionPorCobro(id);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/exportar-pdf')
  async exportarPDF(
    @Param('inmuebleId',ParseIntPipe)inmuebleId:number,
    @Res() res:any,
    @Query('desde') desde?:string,
    @Query('hasta') hasta?:string
  ){
    const pdfBuffer = await this.cobrosService.generarPDFCobros(inmuebleId, desde, hasta);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cobros-inmueble-${inmuebleId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.end(pdfBuffer);
  }
}
