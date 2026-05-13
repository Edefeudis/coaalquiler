import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropietariosModule } from './propietarios/propietarios.module';
import { CobrosModule } from './cobros/cobros.module';
import { GastosModule } from './gastos/gastos.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { InmueblesModule } from './inmuebles/inmuebles.module';

@Module({
  imports:[
    PrismaModule,
    AuthModule,
    PropietariosModule,
    CobrosModule,
    GastosModule,
    AuditoriaModule,
    FacturacionModule,
    InmueblesModule,
  ],
})
export class AppModule{}
