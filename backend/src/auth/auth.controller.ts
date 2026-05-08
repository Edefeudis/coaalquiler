import{Controller,Post,Get,Body,UseGuards,Request}from'@nestjs/common';
import{AuthService}from'./auth.service';
import{JwtAuthGuard}from'./guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController{
  constructor(private readonly authService:AuthService){}

  @Post('login')
  login(@Body()body:{email:string}){
    return this.authService.loginPropietario(body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request()req:any){
    return this.authService.getCurrentUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('inmuebles')
  getInmuebles(@Request()req:any){
    return this.authService.getInmueblesAccesibles(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verificar-acceso/:inmuebleId')
  verificarAcceso(@Request()req:any,@Body()body:{inmuebleId:number}){
    return this.authService.verificarAccesoInmueble(req.user.sub,body.inmuebleId);
  }
}