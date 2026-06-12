import { Controller, Get, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument = require('pdfkit');
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
    @Res() res: Response,
  ) {
    const datos = await this.reciboService.obtenerDatosRecibo(propietarioId, periodo);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Recibo de Distribución - ${datos.periodo}`,
        Author: 'CoAlquiler',
      },
      autoFirstPage: false,
    });
    doc.addPage();

    const filename = `recibo-${datos.propietario.nombre}-${periodo}.pdf`;
    const pageW = doc.page.width;
    const margin = doc.page.margins.left;
    const contentW = pageW - margin * 2;
    let y = doc.page.margins.top;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    doc.pipe(res);

    // ── Helper: ensure page break if needed ──
    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };

    // ── Encabezado ──
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('RECIBO DE DISTRIBUCIÓN', margin, y, { width: contentW, align: 'center' });
    y = doc.y + 5;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Período: ${this.getNombreMes(datos.periodo)}`, margin, y, { width: contentW, align: 'center' });
    y = doc.y + 2;
    doc.text(`Fecha de emisión: ${new Date(datos.fechaEmision).toLocaleDateString('es-AR')}`, margin, y, { width: contentW, align: 'center' });
    y = doc.y + 15;

    // ── Datos del propietario ──
    ensureSpace(60);
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Propietario:', margin, y, { width: contentW });
    y = doc.y;
    doc.font('Helvetica').text(datos.propietario.nombre, margin, y, { width: contentW });
    y = doc.y;
    doc.text(`Email: ${datos.propietario.email}`, margin, y, { width: contentW });
    y = doc.y + 15;

    // ── Detalle por inmueble ──
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Detalle por Propiedad', margin, y, { width: contentW });
    y = doc.y + 8;

    for (const detalle of datos.detallePorInmueble) {
      ensureSpace(60);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`${detalle.inmueble.direccion} (${detalle.porcentaje}%)`, margin, y, { width: contentW });
      y = doc.y + 4;

      if (detalle.cobros.length > 0) {
        doc.font('Helvetica-Bold').text('Cobros del período:', margin, y, { width: contentW });
        y = doc.y + 2;
        doc.font('Helvetica');
        for (const cobro of detalle.cobros) {
          ensureSpace(14);
          const fecha = new Date(cobro.fechaCobro).toLocaleDateString('es-AR');
          const bruto = this.formatoMoneda(parseFloat(cobro.montoBruto.toString()));
          const neto = this.formatoMoneda(parseFloat(cobro.montoNeto.toString()));
          doc.text(`  ${fecha}  |  Bruto: ${bruto}  |  Neto: ${neto}`, margin + 10, y, { width: contentW - 10 });
          y = doc.y + 2;
        }
      }

      if (detalle.gastos.length > 0) {
        ensureSpace(30);
        doc.font('Helvetica-Bold').text('Gastos deducidos:', margin, y, { width: contentW });
        y = doc.y + 2;
        doc.font('Helvetica');
        for (const gasto of detalle.gastos) {
          ensureSpace(14);
          const fecha = new Date(gasto.fecha).toLocaleDateString('es-AR');
          const monto = this.formatoMoneda(parseFloat(gasto.monto.toString()));
          const parte = this.formatoMoneda(parseFloat(gasto.montoPropietario.toString()));
          doc.text(`  ${fecha}  |  ${gasto.concepto}  |  Total: ${monto}  |  Tu parte: ${parte}`, margin + 10, y, { width: contentW - 10 });
          y = doc.y + 2;
        }
      }

      // Totales del inmueble
      ensureSpace(20);
      const cobrosP = this.formatoMoneda(detalle.totales.cobrosPropietario);
      const gastosP = this.formatoMoneda(detalle.totales.gastosPropietario);
      doc.font('Helvetica-Bold').text(`  Subtotal cobros: ${cobrosP}  |  Subtotal gastos: ${gastosP}`, margin, y, { width: contentW });
      y = doc.y + 12;
    }

    // ── Movimientos Cuenta Corriente ──
    if (datos.movimientosCuentaCorriente.length > 0) {
      ensureSpace(40);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Movimientos de Cuenta Corriente', margin, y, { width: contentW });
      y = doc.y + 8;

      // Encabezados de tabla
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Fecha', margin, y, { width: 70 });
      doc.text('Tipo', margin + 75, y, { width: 90 });
      doc.text('Descripción', margin + 170, y, { width: 160 });
      doc.text('Monto', margin + 340, y, { width: 80, align: 'right' as const });
      doc.text('Saldo', margin + 420, y, { width: 80, align: 'right' as const });
      y = doc.y + 5;

      // Filas
      doc.font('Helvetica').fontSize(8);
      for (const mov of datos.movimientosCuentaCorriente) {
        ensureSpace(14);
        const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
        const monto = this.formatoMoneda(parseFloat(mov.monto.toString()));
        const saldo = this.formatoMoneda(parseFloat(mov.saldoNuevo.toString()));
        doc.text(fecha, margin, y, { width: 70 });
        doc.text(mov.tipoMovimiento, margin + 75, y, { width: 90 });
        doc.text(mov.descripcion || '-', margin + 170, y, { width: 160 });
        doc.text(monto, margin + 340, y, { width: 80, align: 'right' as const });
        doc.text(saldo, margin + 420, y, { width: 80, align: 'right' as const });
        y = doc.y + 4;
      }
      y += 8;
    }

    // ── Resumen del período ──
    ensureSpace(120);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Resumen del Período', margin, y, { width: contentW });
    y = doc.y + 8;

    doc.fontSize(10).font('Helvetica');
    const lineas: [string, string][] = [
      ['Saldo Anterior:', this.formatoMoneda(datos.resumen.saldoAnteriorPeriodo)],
      ['Total Acreditado:', this.formatoMoneda(datos.resumen.totalAcreditado)],
      ['Gastos (tu parte):', this.formatoMoneda(datos.resumen.totalGastosPropietario)],
      ['Total Retiros:', this.formatoMoneda(datos.resumen.totalRetiros)],
    ];

    for (const [label, valor] of lineas) {
      doc.text(label, margin, y, { width: 200 });
      doc.text(valor, margin + 200, y, { width: contentW - 200, align: 'right' as const });
      y = doc.y + 3;
    }

    y += 5;
    const sf = datos.resumen.saldoFinal;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Saldo Final: ${this.formatoMoneda(sf)}`, margin, y, { width: contentW });

    doc.end();
  }

  private getNombreMes(periodo: string): string {
    const [year, month] = periodo.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[parseInt(month) - 1]} ${year}`;
  }

  private formatoMoneda(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  }
}