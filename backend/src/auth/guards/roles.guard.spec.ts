import{ExecutionContext,ForbiddenException}from'@nestjs/common';
import{Reflector}from'@nestjs/core';
import{RolesGuard}from'./roles.guard';
import{Rol}from'../auth.service';

describe('RolesGuard',()=>{
  let guard:RolesGuard;
  let reflector:Reflector;

  beforeEach(()=>{
    reflector=new Reflector();
    guard=new RolesGuard(reflector);
  });

  function createContext(user?:{rol:Rol}):ExecutionContext{
    return{
      switchToHttp:()=>({
        getRequest:()=>({user}),
      }),
      getHandler:()=>{},
      getClass:()=>{},
    } as ExecutionContext;
  }

  it('debería permitir acceso si no hay roles requeridos',()=>{
    jest.spyOn(reflector,'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('debería permitir acceso si el rol coincide',()=>{
    jest.spyOn(reflector,'getAllAndOverride').mockReturnValue([Rol.PROPIETARIO]);
    expect(guard.canActivate(createContext({rol:Rol.PROPIETARIO}))).toBe(true);
  });

  it('debería denegar acceso si el rol no coincide',()=>{
    jest.spyOn(reflector,'getAllAndOverride').mockReturnValue([Rol.ADMIN]);
    expect(()=>guard.canActivate(createContext({rol:Rol.PROPIETARIO}))).toThrow(ForbiddenException);
  });

  it('debería denegar acceso si no hay usuario autenticado',()=>{
    jest.spyOn(reflector,'getAllAndOverride').mockReturnValue([Rol.PROPIETARIO]);
    expect(()=>guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});
