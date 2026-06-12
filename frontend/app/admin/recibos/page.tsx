'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRecibosPage() {
  const [generating, setGenerating] = useState(false);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [propietariosFiltrados, setPropietariosFiltrados] = useState<any[]>([]);
  const [selectedPropietarioId, setSelectedPropietarioId] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reciboData, setReciboData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchPropietarios();
  }, [router]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = propietarios.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setPropietariosFiltrados(filtered);
    } else {
      setPropietariosFiltrados(propietarios);
    }
  }, [searchTerm, propietarios]);

  async function fetchPropietarios() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/propietarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPropietarios(data);
        setPropietariosFiltrados(data);
      }
    } catch (err) {
      console.error('Error fetching propietarios:', err);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  function getMonthName(periodo: string) {
    const [year, month] = periodo.split('-');
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  }

  async function handleGenerarRecibo() {
    if (!selectedPropietarioId || !selectedPeriodo) {
      alert('Seleccione un propietario y un período');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/recibo/${selectedPropietarioId}/${selectedPeriodo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setReciboData(data);
      } else {
        alert('Error al generar recibo. Verifique que el período tenga datos.');
      }
    } catch (err) {
      console.error('Error generando recibo:', err);
      alert('Error al generar recibo');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDescargarPDF() {
    if (!selectedPropietarioId || !selectedPeriodo) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/recibo/${selectedPropietarioId}/${selectedPeriodo}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const propietario = propietarios.find(p => p.id === parseInt(selectedPropietarioId));
        a.href = url;
        a.download = `recibo-${propietario?.nombre || 'propietario'}-${selectedPeriodo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error al descargar PDF');
      }
    } catch (err) {
      console.error('Error descargando PDF:', err);
      alert('Error al descargar PDF');
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-[#B8E6E6] hover:text-white transition-colors">
                ← Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB]">Recibos de Distribución</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-teal-100">
          <h2 className="text-xl font-bold text-teal-700 mb-4">Generar Recibo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-1">Propietario</label>
              <input
                type="text"
                placeholder="Buscar propietario..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400 mb-2"
              />
              <select
                value={selectedPropietarioId}
                onChange={e => setSelectedPropietarioId(e.target.value)}
                className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400"
                size={5}
              >
                {propietariosFiltrados.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.nombre} ({prop.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-teal-600 mb-1">Período</label>
              <input
                type="month"
                value={selectedPeriodo}
                onChange={e => setSelectedPeriodo(e.target.value)}
                className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerarRecibo}
                disabled={generating || !selectedPropietarioId || !selectedPeriodo}
                className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {generating ? 'Generando...' : 'Generar Recibo'}
              </button>
            </div>
          </div>
        </div>

        {reciboData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-teal-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-teal-700">Recibo de Distribución</h2>
                  <p className="text-teal-500 mt-1">
                    Período: <strong>{getMonthName(reciboData.periodo)}</strong>
                  </p>
                </div>
                <button
                  onClick={handleDescargarPDF}
                  className="px-4 py-2 bg-copper-400 hover:bg-copper-500 text-white rounded-md transition-colors"
                >
                  Descargar PDF
                </button>
              </div>

              <div className="border-t border-teal-100 pt-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-teal-500">Propietario</p>
                    <p className="font-semibold text-teal-700">{reciboData.propietario.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-teal-500">Email</p>
                    <p className="font-semibold text-teal-700">{reciboData.propietario.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-teal-500">Fecha de Emisión</p>
                    <p className="font-semibold text-teal-700">
                      {new Date(reciboData.fechaEmision).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-teal-500">Período</p>
                    <p className="font-semibold text-teal-700">{reciboData.periodo}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-teal-700 mb-4">Detalle por Propiedad</h3>
              
              {reciboData.detallePorInmueble.map((detalle: any, idx: number) => (
                <div key={detalle.inmueble.id} className="mb-6 p-4 bg-teal-50 rounded-lg">
                  <h4 className="font-bold text-teal-700 text-lg mb-2">
                    {idx + 1}. {detalle.inmueble.direccion}
                    <span className="text-sm font-normal text-teal-500 ml-2">
                      ({detalle.porcentaje}%)
                    </span>
                  </h4>

                  {detalle.cobros.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-teal-600 mb-2">Cobros del Período</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-teal-100">
                              <th className="px-3 py-2 text-left text-teal-700">Fecha</th>
                              <th className="px-3 py-2 text-left text-teal-700">Período</th>
                              <th className="px-3 py-2 text-right text-teal-700">Monto Bruto</th>
                              <th className="px-3 py-2 text-right text-teal-700">Gastos</th>
                              <th className="px-3 py-2 text-right text-teal-700">Monto Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.cobros.map((cobro: any) => (
                              <tr key={cobro.id} className="border-b border-teal-100">
                                <td className="px-3 py-2 text-teal-600">
                                  {new Date(cobro.fechaCobro).toLocaleDateString('es-AR')}
                                </td>
                                <td className="px-3 py-2 text-teal-600">{cobro.periodo}</td>
                                <td className="px-3 py-2 text-right font-medium text-teal-700">
                                  {formatCurrency(parseFloat(cobro.montoBruto))}
                                </td>
                                <td className="px-3 py-2 text-right text-copper-600">
                                  {formatCurrency(parseFloat(cobro.gastosTotal))}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-teal-600">
                                  {formatCurrency(parseFloat(cobro.montoNeto))}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-teal-50 font-bold">
                              <td colSpan={2} className="px-3 py-2 text-teal-700">Total</td>
                              <td className="px-3 py-2 text-right text-teal-700">
                                {formatCurrency(detalle.totales.totalCobros)}
                              </td>
                              <td className="px-3 py-2 text-right text-copper-600">
                                {formatCurrency(detalle.totales.totalGastos)}
                              </td>
                              <td className="px-3 py-2 text-right text-teal-600">
                                {formatCurrency(detalle.totales.totalCobros - detalle.totales.totalGastos)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detalle.gastos.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-teal-600 mb-2">Gastos Deducidos</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-copper-50">
                              <th className="px-3 py-2 text-left text-teal-700">Fecha</th>
                              <th className="px-3 py-2 text-left text-teal-700">Concepto</th>
                              <th className="px-3 py-2 text-left text-teal-700">Descripción</th>
                              <th className="px-3 py-2 text-right text-teal-700">Total</th>
                              <th className="px-3 py-2 text-right text-teal-700">Tu parte ({detalle.porcentaje}%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.gastos.map((gasto: any) => (
                              <tr key={gasto.id} className="border-b border-copper-50">
                                <td className="px-3 py-2 text-teal-600">
                                  {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                                </td>
                                <td className="px-3 py-2 text-teal-600">{gasto.concepto}</td>
                                <td className="px-3 py-2 text-teal-400">{gasto.descripcion || '-'}</td>
                                <td className="px-3 py-2 text-right text-copper-600 font-medium">
                                  {formatCurrency(parseFloat(gasto.monto))}
                                </td>
                                <td className="px-3 py-2 text-right text-copper-600 font-medium">
                                  {formatCurrency(gasto.montoPropietario || parseFloat(gasto.monto) * (parseFloat(detalle.porcentaje) / 100))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <h3 className="text-lg font-bold text-teal-700 mb-4">Movimientos de Cuenta Corriente</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-teal-50">
                      <th className="px-3 py-2 text-left text-teal-700">Fecha</th>
                      <th className="px-3 py-2 text-left text-teal-700">Tipo</th>
                      <th className="px-3 py-2 text-left text-teal-700">Descripción</th>
                      <th className="px-3 py-2 text-right text-teal-700">Monto</th>
                      <th className="px-3 py-2 text-right text-teal-700">Saldo Nuevo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reciboData.movimientosCuentaCorriente.map((mov: any) => (
                      <tr key={mov.id} className="border-b border-teal-50">
                        <td className="px-3 py-2 text-teal-600">
                          {new Date(mov.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            mov.tipoMovimiento === 'DISTRIBUCION'
                              ? 'bg-teal-100 text-teal-700'
                              : mov.tipoMovimiento === 'DEBITO'
                              ? 'bg-copper-100 text-copper-600'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {mov.tipoMovimiento}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-teal-600">{mov.descripcion || '-'}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          mov.tipoMovimiento === 'DISTRIBUCION' ? 'text-teal-600' : 'text-copper-600'
                        }`}>
                          {mov.tipoMovimiento === 'DISTRIBUCION' ? '+' : '-'}
                          {formatCurrency(parseFloat(mov.monto))}
                        </td>
                        <td className="px-3 py-2 text-right text-teal-700 font-medium">
                          {formatCurrency(parseFloat(mov.saldoNuevo))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-teal-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-teal-700 mb-4">Resumen del Período</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-sm text-teal-500">Saldo Anterior</p>
                    <p className="text-lg font-bold text-teal-700">
                      {formatCurrency(reciboData.resumen.saldoAnteriorPeriodo)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-sm text-teal-500">Total Acreditado</p>
                    <p className="text-lg font-bold text-teal-600">
                      {formatCurrency(reciboData.resumen.totalAcreditado)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-sm text-teal-500">Gastos (tu parte)</p>
                    <p className="text-lg font-bold text-copper-600">
                      {formatCurrency(reciboData.resumen.totalGastosPropietario)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-sm text-teal-500">Total Retiros</p>
                    <p className="text-lg font-bold text-copper-600">
                      {formatCurrency(reciboData.resumen.totalRetiros)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-sm text-teal-500">Saldo Final</p>
                    <p className={`text-lg font-bold ${
                      reciboData.resumen.saldoFinal >= 0 ? 'text-teal-600' : 'text-copper-600'
                    }`}>
                      {formatCurrency(reciboData.resumen.saldoFinal)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}