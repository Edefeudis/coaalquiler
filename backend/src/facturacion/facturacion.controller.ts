import{Controller,Get,Post,Param,ParseIntPipe,UseGuards}from'@nestjs/common';
import{FacturacionService}from'./facturacion.service';
import{JwtAuthGuard}from'../auth/guards/jwt-auth.guard';
import{RolesGuard}from'../auth/guards/roles.guard';
import{Roles}from'../auth/decorators/roles.decorator';
import{Rol}from'../auth/auth.service';

@Controller('facturacion')
@UseGuards(JwtAuthGuard,RolesGuard)
export class FacturacionController{
  constructor(private readonly facturacionService:FacturacionService){}

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post('cobro/:cobroId')
  generarFactura(@Param('cobroId',ParseIntPipe)cobroId:number){
    return this.facturacionService.generarFactura(cobroId);
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO)
  @Post('reintentar-pendientes')
  reintentarPendientes(){
    return this.facturacionService.reintentarFacturasPendientes();
  }

  @Roles(Rol.ADMIN,Rol.EMPLEADO,Rol.PROPIETARIO)
  @Get('cobro/:cobroId')
  obtenerFactura(@Param('cobroId',ParseIntPipe)cobroId:number){
    return this.facturacionService.obtenerFacturaPorCobro(cobroId);
  }
}
