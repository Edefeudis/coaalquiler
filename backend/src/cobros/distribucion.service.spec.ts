import{Test,TestingModule}from'@nestjs/testing';
import{DistribucionService}from'./distribucion.service';
import{PrismaService}from'../prisma/prisma.service';
import{AuditoriaService}from'../auditoria/auditoria.service';

describe('DistribucionService',()=>{
  let service:DistribucionService;
  let prisma:PrismaService;

  beforeEach(async()=>{
    const module:TestingModule=await Test.createTestingModule({
      providers:[
        DistribucionService,
        {
          provide:PrismaService,
          useValue:{
            cobroAlquiler:{findUnique:jest.fn()},
            gastoInmueble:{findMany:jest.fn()},
            distribucionCobro:{create:jest.fn(),update:jest.fn(),findMany:jest.fn()},
            $transaction:jest.fn((fn:any)=>fn({
              distribucionCobro:{create:jest.fn(),update:jest.fn()},
              cobroAlquiler:{update:jest.fn()},
            })),
          },
        },
        {
          provide:AuditoriaService,
          useValue:{registrar:jest.fn()},
        },
      ],
    }).compile();

    service=module.get<DistribucionService>(DistribucionService);
    prisma=module.get<PrismaService>(PrismaService);
  });

  it('debería calcular distribución 50/50 correctamente',async()=>{
    const mockCobro={
      id:1,
      montoBruto:10000,
      montoNeto:10000,
      periodo:'2026-05',
      inmueble:{
        id:1,
        propietarios:[
          {propietarioId:1,porcentaje:50.00,propietario:{id:1,nombre:'A',email:'a@test'}},
          {propietarioId:2,porcentaje:50.00,propietario:{id:2,nombre:'B',email:'b@test'}},
        ],
      },
      distribuciones:[],
    };
    jest.spyOn(prisma.cobroAlquiler,'findUnique').mockResolvedValue(mockCobro as any);
    jest.spyOn(prisma.gastoInmueble,'findMany').mockResolvedValue([]);
    jest.spyOn(prisma.$transaction as any,'mockImplementation');

    const txMock={
      distribucionCobro:{
        create:jest.fn().mockImplementation((args:any)=>({...args.data,id:Math.floor(Math.random()*1000)})),
        update:jest.fn(),
      },
      cobroAlquiler:{update:jest.fn()},
    };
    jest.spyOn(prisma,'$transaction').mockImplementation(async(fn:any)=>fn(txMock));

    const result=await service.distribuirCobro(1);
    expect(result.distribuciones).toHaveLength(2);
    expect(Number(result.gastosTotal)).toBe(0);
    expect(Number(result.montoNeto)).toBe(10000);
  });

  it('debería deducir gastos proporcionalmente',async()=>{
    const mockCobro={
      id:1,
      montoBruto:10000,
      montoNeto:10000,
      periodo:'2026-05',
      inmueble:{
        id:1,
        propietarios:[
          {propietarioId:1,porcentaje:60.00,propietario:{id:1,nombre:'A',email:'a@test'}},
          {propietarioId:2,porcentaje:40.00,propietario:{id:2,nombre:'B',email:'b@test'}},
        ],
      },
      distribuciones:[],
    };
    jest.spyOn(prisma.cobroAlquiler,'findUnique').mockResolvedValue(mockCobro as any);
    jest.spyOn(prisma.gastoInmueble,'findMany').mockResolvedValue([{monto:1000}] as any);

    const txMock={
      distribucionCobro:{
        create:jest.fn().mockImplementation((args:any)=>({...args.data,id:1})),
        update:jest.fn(),
      },
      cobroAlquiler:{update:jest.fn()},
    };
    jest.spyOn(prisma,'$transaction').mockImplementation(async(fn:any)=>fn(txMock));

    const result=await service.distribuirCobro(1);
    expect(Number(result.gastosTotal)).toBe(1000);
    expect(Number(result.montoNeto)).toBe(9000);
  });
});
