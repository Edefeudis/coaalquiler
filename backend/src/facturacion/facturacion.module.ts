import{Module}from'@nestjs/common';
import{PrismaModule}from'../prisma/prisma.module';
import{AuthModule}from'../auth/auth.module';
import{AuditoriaModule}from'../auditoria/auditoria.module';
import{ArcaService}from'./arca.service';
import{FacturacionService}from'./facturacion.service';
import{FacturacionController}from'./facturacion.controller';

@Module({
  imports:[PrismaModule,AuthModule,AuditoriaModule],
  controllers:[FacturacionController],
  providers:[ArcaService,FacturacionService],
  exports:[FacturacionService,ArcaService],
})
export class FacturacionModule{}
