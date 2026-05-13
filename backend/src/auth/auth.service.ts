import{Injectable,UnauthorizedException,BadRequestException}from'@nestjs/common';
import{JwtService}from'@nestjs/jwt';
import{PrismaService}from'../prisma/prisma.service';
import*as bcrypt from'bcrypt';

export enum Rol{
  ADMIN='ADMIN',
  EMPLEADO='EMPLEADO',
  PROPIETARIO='PROPIETARIO',
}

export interface JwtPayload{
  sub:number;
  email:string;
  rol:Rol;
}

export interface AuthResponse{
  accessToken:string;
  user:{id:number;email:string;nombre?:string;rol:Rol};
}

export interface UserRequest{
  sub:number;
  email:string;
  rol:Rol;
}

@Injectable()
export class AuthService{
  constructor(
    private readonly prisma:PrismaService,
    private readonly jwtService:JwtService,
  ){}

  /**
   * Login para propietarios - usa email y verificación
   */
  async loginPropietario(email:string):Promise<AuthResponse>{
    const propietario=await this.prisma.propietario.findUnique({where:{email}});
    if(!propietario){
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload:JwtPayload={
      sub:propietario.id,
      email:propietario.email,
      rol:Rol.PROPIETARIO,
    };

    return{
      accessToken:this.jwtService.sign(payload),
      user:{id:propietario.id,email:propietario.email,nombre:propietario.nombre,rol:Rol.PROPIETARIO},
    };
  }

  /**
   * Login para administradores y empleados - usa email y contraseña
   */
  async loginAdmin(email:string,password:string):Promise<AuthResponse>{
    const usuario=await this.prisma.usuario.findUnique({where:{email}});
    if(!usuario||!usuario.activo){
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid=await bcrypt.compare(password,usuario.password);
    if(!passwordValid){
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const rol:Rol=usuario.rol==='ADMIN'?Rol.ADMIN:Rol.EMPLEADO;

    const payload:JwtPayload={
      sub:usuario.id,
      email:usuario.email,
      rol:rol,
    };

    return{
      accessToken:this.jwtService.sign(payload),
      user:{id:usuario.id,email:usuario.email,nombre:usuario.nombre,rol},
    };
  }

  /**
   * Valida un token JWT y retorna el usuario
   */
  async validateToken(token:string):Promise<JwtPayload>{
    try{
      return this.jwtService.verify<JwtPayload>(token);
    }catch{
      throw new UnauthorizedException('Token inválido');
    }
  }

  /**
   * Obtiene el usuario actual desde el token
   */
  async getCurrentUser(userId:number):Promise<{id:number;email:string;nombre?:string;rol:Rol}>{
    // Primero buscar en tabla de usuarios (admin/empleado)
    const usuario=await this.prisma.usuario.findUnique({where:{id:userId}});
    if(usuario){
      const rol:Rol=usuario.rol==='ADMIN'?Rol.ADMIN:Rol.EMPLEADO;
      return{id:usuario.id,email:usuario.email,nombre:usuario.nombre,rol};
    }

    // Luego buscar en tabla de propietarios
    const propietario=await this.prisma.propietario.findUnique({where:{id:userId}});
    if(propietario){
      return{id:propietario.id,email:propietario.email,nombre:propietario.nombre,rol:Rol.PROPIETARIO};
    }

    throw new BadRequestException('Usuario no encontrado');
  }

  /**
   * Verifica si el usuario tiene acceso a un inmueble específico
   */
  async verificarAccesoInmueble(userId:number,inmuebleId:number):Promise<boolean>{
    const relacion=await this.prisma.inmueblePropietario.findFirst({
      where:{propietarioId:userId,inmuebleId,activo:true},
    });
    return!!relacion;
  }

  /**
   * Obtiene todos los inmuebles accesibles para un propietario
   */
  async getInmueblesAccesibles(userId:number){
    return this.prisma.inmueblePropietario.findMany({
      where:{propietarioId:userId,activo:true},
      include:{inmueble:true},
    });
  }
}