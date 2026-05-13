import{Injectable,Logger}from'@nestjs/common';

interface FacturaArcaPayload{
  puntoVenta:number;
  tipoComprobante:number;
  concepto:number;
  docTipo:number;
  docNro:number;
  fechaServDesde?:string;
  fechaServHasta?:string;
  fechaVtoPago?:string;
  importeTotal:number;
  moneda:string;
  cotizacion:number;
}

interface FacturaArcaResponse{
  cae?:string;
  caeFechaVto?:string;
  numero?:string;
  errores?:string[];
}

@Injectable()
export class ArcaService{
  private readonly logger=new Logger(ArcaService.name);
  private readonly baseUrl='https://servicios1.afip.gov.ar/wsfev1/service.asmx';

  async emitirFactura(payload:FacturaArcaPayload):Promise<FacturaArcaResponse>{
    this.logger.log(`Solicitando factura a Arca: total=${payload.importeTotal}`);

    try{
      const response=await fetch(`${this.baseUrl}/FECAESolicitar`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          FeCAEReq:{
            FeCabReq:{
              CantReg:1,
              PtoVta:payload.puntoVenta,
              CbteTipo:payload.tipoComprobante,
            },
            FeDetReq:{
              FECAEDetRequest:{
                Concepto:payload.concepto,
                DocTipo:payload.docTipo,
                DocNro:payload.docNro,
                CbteDesde:1,
                CbteHasta:1,
                ImpTotal:payload.importeTotal,
                ImpTotConc:0,
                ImpNeto:payload.importeTotal,
                ImpOpEx:0,
                ImpIVA:0,
                ImpTrib:0,
                MonId:payload.moneda,
                MonCotiz:payload.cotizacion,
                ...(payload.fechaServDesde?{FchServDesde:payload.fechaServDesde}:{}),
                ...(payload.fechaServHasta?{FchServHasta:payload.fechaServHasta}:{}),
                ...(payload.fechaVtoPago?{FchVtoPago:payload.fechaVtoPago}:{}),
              },
            },
          },
        }),
      });

      if(!response.ok){
        const text=await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data=await response.json();
      if(data.FeDetResp?.FECAEDetResponse?.CAE){
        return{
          cae:data.FeDetResp.FECAEDetResponse.CAE,
          caeFechaVto:data.FeDetResp.FECAEDetResponse.CAEFchVto,
          numero:data.FeDetResp.FECAEDetResponse.CbteDesde,
        };
      }

      const errores=data.Errors?.Err?.map((e:any)=>`${e.Code}: ${e.Msg}`)??['Error desconocido'];
      return{errores};
    }catch(error){
      this.logger.error(`Error al emitir factura: ${error instanceof Error?error.message:String(error)}`);
      return{errores:[error instanceof Error?error.message:String(error)]};
    }
  }
}
