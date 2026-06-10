import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los usuarios
   */
  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene un usuario por ID
   */
  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  /**
   * Crea un nuevo usuario (admin o empleado)
   */
  async create(data: { email: string; password: string; nombre: string; rol: string }) {
    // Validar que el rol sea válido
    if (!['ADMIN', 'EMPLEADO'].includes(data.rol)) {
      throw new BadRequestException('El rol debe ser ADMIN o EMPLEADO');
    }

    // Verificar que el email no exista
    const existente = await this.prisma.usuario.findUnique({ where: { email: data.email } });
    if (existente) {
      throw new BadRequestException('Ya existe un usuario con ese email');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.usuario.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nombre: data.nombre,
        rol: data.rol,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza un usuario
   */
  async update(id: number, data: { email?: string; password?: string; nombre?: string; rol?: string; activo?: boolean }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    // Si se cambia el email, verificar que no exista otro con ese email
    if (data.email && data.email !== usuario.email) {
      const existente = await this.prisma.usuario.findUnique({ where: { email: data.email } });
      if (existente) {
        throw new BadRequestException('Ya existe un usuario con ese email');
      }
    }

    // Validar rol si se envía
    if (data.rol && !['ADMIN', 'EMPLEADO'].includes(data.rol)) {
      throw new BadRequestException('El rol debe ser ADMIN o EMPLEADO');
    }

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.rol !== undefined) updateData.rol = data.rol;
    if (data.activo !== undefined) updateData.activo = data.activo;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Elimina un usuario
   */
  async delete(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    // No permitir eliminar al último administrador
    if (usuario.rol === 'ADMIN') {
      const admins = await this.prisma.usuario.count({ where: { rol: 'ADMIN', activo: true } });
      if (admins <= 1) {
        throw new BadRequestException('No se puede eliminar el único administrador del sistema');
      }
    }

    return this.prisma.usuario.delete({ where: { id } });
  }
}