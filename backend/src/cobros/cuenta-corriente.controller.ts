import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/auth.service';

@Controller('cuenta-corriente')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CuentaCorrienteController {
  constructor(private readonly cuentaCorrienteService: CuentaCorrienteService) {}

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get('propietario/:propietarioId/saldo')
  obtenerSaldoActual(@Param('propietarioId', ParseIntPipe) propietarioId: number, @Query('inmuebleId') inmuebleId?: string) {
    return this.cuentaCorrienteService.obtenerSaldoActual(propietarioId, inmuebleId ? parseInt(inmuebleId) : undefined);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get('propietario/:propietarioId/movimientos')
  obtenerMovimientosPorPropietario(
    @Param('propietarioId', ParseIntPipe) propietarioId: number, 
    @Query('inmuebleId') inmuebleId?: string
  ) {
    return this.cuentaCorrienteService.obtenerMovimientosPorPropietario(propietarioId, inmuebleId ? parseInt(inmuebleId) : undefined);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get('propietario/:propietarioId/resumen')
  obtenerResumenPropietario(@Param('propietarioId', ParseIntPipe) propietarioId: number) {
    return this.cuentaCorrienteService.obtenerResumenPropietario(propietarioId);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Post('movimiento')
  registrarMovimiento(@Body() body: {
    propietarioId: number;
    inmuebleId?: number;
    tipoMovimiento: string;
    monto: number;
    referencia?: string;
    referenciaId?: number;
    descripcion?: string;
  }) {
    return this.cuentaCorrienteService.registrarMovimiento(body);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Post('ajuste')
  registrarAjusteManual(@Body() body: {
    propietarioId: number;
    inmuebleId?: number;
    monto: number;
    tipo: 'POSITIVO' | 'NEGATIVO';
    descripcion: string;
  }) {
    return this.cuentaCorrienteService.registrarAjusteManual(body);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Post('distribucion/:distribucionId/cobro/:cobroId')
  registrarDistribucionCobro(
    @Param('distribucionId', ParseIntPipe) distribucionId: number,
    @Param('cobroId', ParseIntPipe) cobroId: number
  ) {
    return this.cuentaCorrienteService.registrarDistribucionCobro(cobroId, distribucionId);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Post('gasto/:gastoId/propietario/:propietarioId')
  registrarGastoPropietario(
    @Param('gastoId', ParseIntPipe) gastoId: number,
    @Param('propietarioId', ParseIntPipe) propietarioId: number,
    @Body() body: { monto: number; inmuebleId: number }
  ) {
    return this.cuentaCorrienteService.registrarGastoPropietario(gastoId, propietarioId, body.monto, body.inmuebleId);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get('inmueble/:inmuebleId/saldos')
  async obtenerSaldosPorInmueble(@Param('inmuebleId', ParseIntPipe) inmuebleId: number) {
    return this.cuentaCorrienteService.obtenerSaldosPorInmueble(inmuebleId);
  }
}
