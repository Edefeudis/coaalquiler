import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/auth.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles(Rol.ADMIN)
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Roles(Rol.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body() data: { email: string; password: string; nombre: string; rol: string }) {
    return this.usuariosService.create(data);
  }

  @Roles(Rol.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { email?: string; password?: string; nombre?: string; rol?: string; activo?: boolean },
  ) {
    return this.usuariosService.update(id, data);
  }

  @Roles(Rol.ADMIN)
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.delete(id);
  }
}