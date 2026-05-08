import {Module}from'@nestjs/common';
import{PrismaModule}from'../prisma/prisma.module';
import{PropietariosService}from'./propietarios.service';
import{PropietariosController}from'./propietarios.controller';

@Module({
  imports:[PrismaModule],
  controllers:[PropietariosController],
  providers:[PropietariosService],
  exports:[PropietariosService],
})
export class PropietariosModule {}