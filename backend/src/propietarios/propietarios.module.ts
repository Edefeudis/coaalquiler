import {Module}from'@nestjs/common';
import{PrismaModule}from'../prisma/prisma.module';
import{AuthModule}from'../auth/auth.module';
import{PropietariosService}from'./propietarios.service';
import{PropietariosController}from'./propietarios.controller';

@Module({
  imports:[PrismaModule,AuthModule],
  controllers:[PropietariosController],
  providers:[PropietariosService],
  exports:[PropietariosService],
})
export class PropietariosModule {}