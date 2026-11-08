import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { FondoService } from './fondo.service';
import { FondoController } from './fondo.controller';

@Module({
  imports: [PrismaModule, AuthModule, AuditoriaModule],
  controllers: [FondoController],
  providers: [FondoService],
  exports: [FondoService],
})
export class FondoModule {}
