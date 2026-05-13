import{Module}from'@nestjs/common';
import{JwtModule}from'@nestjs/jwt';
import{PassportModule}from'@nestjs/passport';
import{PrismaModule}from'../prisma/prisma.module';
import{AuthService}from'./auth.service';
import{AuthController}from'./auth.controller';
import{JwtStrategy}from'./jwt.strategy';
import{RolesGuard}from'./guards/roles.guard';
import{PropietarioGuard}from'./guards/propietario.guard';

@Module({
  imports:[
    PassportModule.register({defaultStrategy:'jwt'}),
    JwtModule.register({
      secret:process.env.JWT_SECRET||'secret-key',
      signOptions:{expiresIn:'7d'},
    }),
    PrismaModule,
  ],
  controllers:[AuthController],
  providers:[AuthService,JwtStrategy,RolesGuard,PropietarioGuard],
  exports:[AuthService,JwtModule,RolesGuard,PropietarioGuard],
})
export class AuthModule{}