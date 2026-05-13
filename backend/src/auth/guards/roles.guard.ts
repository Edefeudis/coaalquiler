import{Injectable,CanActivate,ExecutionContext,ForbiddenException}from'@nestjs/common';
import{Reflector}from'@nestjs/core';
import{ROLES_KEY}from'../decorators/roles.decorator';
import{Rol}from'../auth.service';

@Injectable()
export class RolesGuard implements CanActivate{
  constructor(private readonly reflector:Reflector){}

  canActivate(ctx:ExecutionContext):boolean{
    const requiredRoles=this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY,[
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if(!requiredRoles||requiredRoles.length===0){
      return true;
    }

    const{user}=ctx.switchToHttp().getRequest();
    if(!user){
      throw new ForbiddenException('Usuario no autenticado');
    }

    if(!requiredRoles.includes(user.rol as Rol)){
      throw new ForbiddenException('No tiene permisos para acceder a este recurso');
    }

    return true;
  }
}
