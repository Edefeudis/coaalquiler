import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { FondoService } from './fondo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/auth.service';

@Controller('fondo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FondoController {
  constructor(private readonly fondoService: FondoService) {}

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Get()
  obtenerResumen() {
    return this.fondoService.obtenerResumen();
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Get('saldo')
  obtenerSaldo() {
    return this.fondoService.obtenerSaldo();
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Post('movimiento')
  registrarMovimiento(@Body() body: { tipo: string; monto: number; fecha?: string; descripcion?: string }) {
    return this.fondoService.registrarMovimiento(body);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO)
  @Delete('movimiento/:id')
  eliminarMovimiento(@Param('id', ParseIntPipe) id: number) {
    return this.fondoService.eliminarMovimiento(id);
  }
}
