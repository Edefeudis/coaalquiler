import{Injectable,CanActivate,ExecutionContext,ForbiddenException}from'@nestjs/common';
import{AuthService,Rol}from'../auth.service';

@Injectable()
export class PropietarioGuard implements CanActivate{
  constructor(private readonly authService:AuthService){}

  async canActivate(ctx:ExecutionContext):Promise<boolean>{
    const request=ctx.switchToHttp().getRequest();
    const user=request.user;

    if(!user){
      throw new ForbiddenException('Usuario no autenticado');
    }

    // ADMIN y EMPLEADO tienen acceso total
    if(user.rol===Rol.ADMIN||user.rol===Rol.EMPLEADO){
      return true;
    }

    // PROPIETARIO solo accede a sus propios recursos
    if(user.rol!==Rol.PROPIETARIO){
      throw new ForbiddenException('Rol no autorizado');
    }

    const params=request.params;
    const inmuebleId=params.inmuebleId?Number(params.inmuebleId):undefined;
    const propietarioId=params.id?Number(params.id):undefined;

    // Si accede a datos de un propietario específico, verificar que sea él mismo
    if(propietarioId!==undefined&&propietarioId!==user.sub){
      throw new ForbiddenException('No puede acceder a datos de otro propietario');
    }

    // Si accede a un inmueble específico, verificar que tenga acceso
    if(inmuebleId!==undefined){
      const tieneAcceso=await this.authService.verificarAccesoInmueble(user.sub,inmuebleId);
      if(!tieneAcceso){
        throw new ForbiddenException('No tiene acceso a este inmueble');
      }
    }

    // Guardar inmuebles accesibles en request para uso posterior
    request.inmueblesAccesibles=await this.authService.getInmueblesAccesibles(user.sub);
    return true;
  }
}
