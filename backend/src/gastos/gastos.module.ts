import{Module}from'@nestjs/common';
import{PrismaModule}from'../prisma/prisma.module';
import{AuthModule}from'../auth/auth.module';
import{AuditoriaModule}from'../auditoria/auditoria.module';
import{GastosService}from'./gastos.service';
import{GastosController}from'./gastos.controller';

@Module({
  imports:[PrismaModule,AuthModule,AuditoriaModule],
  controllers:[GastosController],
  providers:[GastosService],
  exports:[GastosService],
})
export class GastosModule{}
