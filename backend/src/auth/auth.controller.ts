import{Controller,Post,Get,Body,UseGuards,Param,ParseIntPipe}from'@nestjs/common';
import{AuthService}from'./auth.service';
import{JwtAuthGuard}from'./guards/jwt-auth.guard';
import{CurrentUser}from'./decorators/current-user.decorator';

@Controller('auth')
export class AuthController{
  constructor(private readonly authService:AuthService){}

  @Post('login')
  login(@Body()body:{email:string}){
    return this.authService.loginPropietario(body.email);
  }

  @Post('admin/login')
  adminLogin(@Body()body:{email:string;password:string}){
    return this.authService.loginAdmin(body.email,body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser()user:any){
    return this.authService.getCurrentUser(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('inmuebles')
  getInmuebles(@CurrentUser()user:any){
    return this.authService.getInmueblesAccesibles(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verificar-acceso/:inmuebleId')
  verificarAcceso(@CurrentUser()user:any,@Param('inmuebleId',ParseIntPipe)inmuebleId:number){
    return this.authService.verificarAccesoInmueble(user.sub,inmuebleId);
  }
}