'use client';

import { useEffect, useState } from 'react';

interface ReciboData {
  recibo: {
    id: number;
    fechaEmision: string;
    periodo: string;
    fechaCobro: string;
  };
  inmueble: {
    id: number;
    direccion: string;
  };
  resumen: {
    montoBruto: number;
    totalGastos: number;
    montoNetoGlobal: number;
  };
  gastos: Array<{
    id: number;
    concepto: string;
    monto: number;
    fecha: string;
    descripcion: string | null;
  }>;
  distribuciones: Array<{
    id: number;
    propietario: { id: number; nombre: string; email: string };
    porcentaje: number;
    montoAsignado: number;
    gastosDeducidos: number;
    montoNeto: number;
  }>;
  detallePropietarios: Array<{
    propietario: { id: number; nombre: string; email: string };
    porcentaje: number;
    montoAsignado: number;
    gastosDeducidos: number;
    montoNeto: number;
    detalleGastos: Array<{
      concepto: string;
      montoOriginal: number;
      montoProporcional: number;
      fecha: string;
    }>;
  }>;
}

interface Props {
  cobroId: number | null;
  onClose: () => void;
}

export default function ReciboDistribucion({ cobroId, onClose }: Props) {
  const [data, setData] = useState<ReciboData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cobroId) return;
    cargarRecibo(cobroId);
  }, [cobroId]);

  async function cargarRecibo(id: number) {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/${id}/recibo`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Error al cargar el recibo');
      }
    } catch (err) {
      setError('Error de conexiÃ³n al cargar el recibo');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function getMonthName(periodo: string) {
    const [year, month] = periodo.split('-');
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  }

  function handlePrint() {
    window.print();
  }

  if (!cobroId) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:inset-auto print:relative">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none">
          
          {/* Header - hidden on print */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-10">
            <h2 className="text-xl font-bold text-gray-900">
              Recibo de DistribuciÃ³n
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir / Reimprimir
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 print:p-8">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando recibo...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-6">
                {/* TÃ­tulo del recibo */}
                <div className="text-center border-b-2 border-gray-400 pb-4 mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">RECIBO DE DISTRIBUCIÃ“N</h1>
                  <p className="text-gray-500 mt-1">Recibo NÂ° {data.recibo.id.toString().padStart(6, '0')}</p>
                </div>

                {/* InformaciÃ³n general */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-semibold">PerÃ­odo:</span> {getMonthName(data.recibo.periodo)}</p>
                    <p><span className="font-semibold">Fecha de Cobro:</span> {formatDate(data.recibo.fechaCobro)}</p>
                    <p><span className="font-semibold">Fecha de EmisiÃ³n:</span> {formatDate(data.recibo.fechaEmision)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{data.inmueble.direccion}</p>
                    <p className="text-gray-500">Propiedad</p>
                  </div>
                </div>

                {/* Resumen general */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 mb-3">Resumen General</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded p-3">
                      <p className="text-sm text-gray-500">Cobro de Alquiler</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(data.resumen.montoBruto)}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-sm text-gray-500">Total Gastos</p>
                      <p className="text-lg font-bold text-red-600">- {formatCurrency(data.resumen.totalGastos)}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-sm text-gray-500">Total Neto a Distribuir</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(data.resumen.montoNetoGlobal)}</p>
                    </div>
                  </div>
                </div>

                {/* Detalle de gastos */}
                {data.gastos.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Gastos del PerÃ­odo</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-600">Concepto</th>
                          <th className="text-right py-2 font-medium text-gray-600">Monto</th>
                          <th className="text-right py-2 font-medium text-gray-600">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.gastos.map(g => (
                          <tr key={g.id} className="border-b border-gray-100">
                            <td className="py-2">
                              {g.concepto}
                              {g.descripcion && (
                                <p className="text-xs text-gray-400">{g.descripcion}</p>
                              )}
                            </td>
                            <td className="py-2 text-right text-red-600">{formatCurrency(g.monto)}</td>
                            <td className="py-2 text-right text-gray-500">{formatDate(g.fecha)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-gray-50">
                          <td className="py-2">Total Gastos</td>
                          <td className="py-2 text-right text-red-600">{formatCurrency(data.resumen.totalGastos)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DistribuciÃ³n por propietario */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">DistribuciÃ³n de Fondos</h3>

                  {data.detallePropietarios.map((dp, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">{dp.propietario.nombre}</h4>
                          <p className="text-sm text-gray-500">{dp.propietario.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Porcentaje</p>
                          <p className="font-bold">{dp.porcentaje}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-xs text-green-700">Cobro de la Propiedad</p>
                          <p className="font-semibold text-green-700">{formatCurrency(dp.montoAsignado)}</p>
                        </div>
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-xs text-red-700">Proporcional de Gastos</p>
                          <p className="font-semibold text-red-700">- {formatCurrency(dp.gastosDeducidos)}</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-xs text-blue-700">DistribuciÃ³n de Fondos</p>
                          <p className="font-semibold text-blue-700">{formatCurrency(dp.montoNeto)}</p>
                        </div>
                      </div>

                      {/* Detalle proporcional de cada gasto */}
                      {dp.detalleGastos.length > 0 && (
                        <div className="ml-4 border-l-2 border-gray-200 pl-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">Detalle de gastos proporcionales:</p>
                          {dp.detalleGastos.map((dg, gIdx) => (
                            <div key={gIdx} className="flex justify-between text-xs text-gray-600 py-1">
                              <span>
                                Proporcional de gasto "{dg.concepto}" ({dp.porcentaje}%)
                              </span>
                              <span className="font-medium text-red-500">
                                - {formatCurrency(dg.montoProporcional)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Totales por propietario */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Asignado: </span>
                            <span className="font-medium text-green-600">{formatCurrency(dp.montoAsignado)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Gastos ({dp.porcentaje}%): </span>
                            <span className="font-medium text-red-600">- {formatCurrency(dp.gastosDeducidos)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500">Neto a distribuir: </span>
                          <span className="font-bold text-blue-600">{formatCurrency(dp.montoNeto)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen final */}
                <div className="bg-gray-100 rounded-lg p-4 mt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">Total Distribuido</p>
                      <p className="text-sm text-gray-500">
                        {data.distribuciones.length} propietario{data.distribuciones.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(data.resumen.montoNetoGlobal)}
                      </p>
                      <p className="text-xs text-gray-500">
                        (Cobro: {formatCurrency(data.resumen.montoBruto)} - Gastos: {formatCurrency(data.resumen.totalGastos)})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
                  <p>Este es un recibo de distribuciÃ³n generado automÃ¡ticamente por el sistema.</p>
                  <p>Documento vÃ¡lido como comprobante de distribuciÃ³n de fondos.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0,
          .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .sticky {
            display: none !important;
          }
          .bg-black {
            background: none !important;
          }
          .max-h-\[90vh\] {
            max-height: none !important;
            overflow: visible !important;
          }
          .shadow-xl {
            box-shadow: none !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
