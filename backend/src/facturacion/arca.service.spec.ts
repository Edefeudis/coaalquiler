import{ArcaService}from'./arca.service';

describe('ArcaService',()=>{
  let service:ArcaService;

  beforeEach(()=>{
    service=new ArcaService();
  });

  it('debería estar definido',()=>{
    expect(service).toBeDefined();
  });

  it('emitirFactura debería manejar errores de red',async()=>{
    global.fetch=jest.fn().mockRejectedValue(new Error('Network error'));
    const result=await service.emitirFactura({
      puntoVenta:1,
      tipoComprobante:11,
      concepto:1,
      docTipo:99,
      docNro:0,
      importeTotal:10000,
      moneda:'PES',
      cotizacion:1,
    });
    expect(result.errores).toContain('Network error');
  });
});
