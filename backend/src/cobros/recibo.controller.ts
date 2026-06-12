import { Controller, Get, Param, ParseIntPipe, UseGuards, Res, Query } from '@nestjs/common';
import { ReciboService } from './recibo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/auth.service';

@Controller('cobros/recibo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReciboController {
  constructor(private readonly reciboService: ReciboService) {}

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get(':propietarioId/:periodo')
  async obtenerRecibo(
    @Param('propietarioId', ParseIntPipe) propietarioId: number,
    @Param('periodo') periodo: string,
  ) {
    return this.reciboService.obtenerDatosRecibo(propietarioId, periodo);
  }

  @Roles(Rol.ADMIN, Rol.EMPLEADO, Rol.PROPIETARIO)
  @Get(':propietarioId/:periodo/pdf')
  async obtenerReciboPDF(
    @Param('propietarioId', ParseIntPipe) propietarioId: number,
    @Param('periodo') periodo: string,
    @Res() res: any,
  ) {
    const datos = await this.reciboService.obtenerDatosRecibo(propietarioId, periodo);
    
    // Generar PDF en texto plano (luego se mejorará con jspdf)
    let contenido = `RECIBO DE DISTRIBUCIÓN\n`;
    contenido += `==========================\n\n`;
    contenido += `Propietario: ${datos.propietario.nombre}\n`;
    contenido += `Período: ${datos.periodo}\n`;
    contenido += `Emisión: ${new Date(datos.fechaEmision).toLocaleDateString('es-AR')}\n\n`;
    contenido += `--- DETALLE POR INMUEBLE ---\n\n`;

    for (const detalle of datos.detallePorInmueble) {
      contenido += `Inmueble: ${detalle.inmueble.direccion}\n`;
      contenido += `Porcentaje: ${detalle.porcentaje}%\n`;
      
      if (detalle.cobros.length > 0) {
        contenido += `\nCobros:\n`;
        for (const cobro of detalle.cobros) {
          contenido += `  - ${cobro.periodo} | ${new Date(cobro.fechaCobro).toLocaleDateString('es-AR')} | $${cobro.montoBruto}\n`;
        }
      }
      
      if (detalle.gastos.length > 0) {
        contenido += `\nGastos:\n`;
        for (const gasto of detalle.gastos) {
          contenido += `  - ${new Date(gasto.fecha).toLocaleDateString('es-AR')} | ${gasto.concepto} | $${gasto.monto}\n`;
        }
      }
      contenido += `\n`;
    }

    contenido += `--- MOVIMIENTOS CUENTA CORRIENTE ---\n\n`;
    for (const mov of datos.movimientosCuentaCorriente) {
      contenido += `${new Date(mov.fecha).toLocaleDateString('es-AR')} | ${mov.tipoMovimiento} | ${mov.descripcion || ''} | $${mov.monto} | Saldo: $${mov.saldoNuevo}\n`;
    }

    contenido += `\n--- RESUMEN ---\n\n`;
    contenido += `Saldo anterior: $${datos.resumen.saldoAnteriorPeriodo.toFixed(2)}\n`;
    contenido += `Total acreditado: $${datos.resumen.totalAcreditado.toFixed(2)}\n`;
    contenido += `Total retiros: $${datos.resumen.totalRetiros.toFixed(2)}\n`;
    contenido += `Saldo final: $${datos.resumen.saldoFinal.toFixed(2)}\n`;

    const pdfBuffer = Buffer.from(contenido, 'utf-8');
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-${datos.propietario.nombre}-${periodo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}