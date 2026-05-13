import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CobrosService } from './cobros.service';
import { DistribucionService } from './distribucion.service';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { CobrosController } from './cobros.controller';
import { CuentaCorrienteController } from './cuenta-corriente.controller';

@Module({
  imports:[PrismaModule,AuthModule,AuditoriaModule],
  controllers:[CobrosController,CuentaCorrienteController],
  providers:[CobrosService,DistribucionService,CuentaCorrienteService],
  exports:[CobrosService,DistribucionService,CuentaCorrienteService],
})
export class CobrosModule{}
