'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCobrosPage() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [cobros, setCobros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [ultimoCobro, setUltimoCobro] = useState<any>(null);
  const [variacion, setVariacion] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    inmuebleId: '', 
    periodo: '', 
    montoBruto: '', 
    fechaCobro: '' 
  });
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [resumenPeriodo, setResumenPeriodo] = useState<any>(null);
  const [detalleInmuebles, setDetalleInmuebles] = useState<any[]>([]);
  const [dateFilters, setDateFilters] = useState({ desde: '', hasta: '' });
  const [collapsedCobros, setCollapsedCobros] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('cobros');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchInmuebles();
  }, [router]);

  useEffect(() => {
    if (periodoSeleccionado) {
      cargarDatosPeriodo();
    }
  }, [periodoSeleccionado]);

  async function cargarDatosPeriodo() {
    try {
      const token = localStorage.getItem('token');
      
      // Cargar todos los inmuebles con sus cobros del período
      const inmueblesConCobros = [];
      
      for (const inmueble of inmuebles) {
        // Cargar cobros del inmueble para el período
        const cobrosRes = await fetch(`http://localhost:3000/api/cobros/inmueble/${inmueble.id}/filtrados?desde=${periodoSeleccionado}-01&hasta=${periodoSeleccionado}-31`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Cargar gastos del inmueble para el período
        const gastosRes = await fetch(`http://localhost:3000/api/gastos/inmueble/${inmueble.id}?desde=${periodoSeleccionado}-01&hasta=${periodoSeleccionado}-31`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (cobrosRes.ok && gastosRes.ok) {
          const cobrosData = await cobrosRes.json();
          const gastosData = await gastosRes.json();
          
          const totalCobros = cobrosData.reduce((sum: number, cobro: any) => sum + cobro.montoBruto, 0);
          const totalGastos = gastosData.reduce((sum: number, gasto: any) => sum + gasto.monto, 0);
          
          inmueblesConCobros.push({
            inmueble,
            cobros: cobrosData,
            gastos: gastosData,
            totales: {
              totalCobros,
              totalGastos,
              saldoNeto: totalCobros - totalGastos
            }
          });
        }
      }
      
      // Calcular resumen general
      const resumenGeneral = {
        totalCobros: inmueblesConCobros.reduce((sum: number, item: any) => sum + item.totalCobros, 0),
        totalGastos: inmueblesConCobros.reduce((sum: number, item: any) => sum + item.totalGastos, 0),
        saldoNeto: inmueblesConCobros.reduce((sum: number, item: any) => sum + item.saldoNeto, 0)
      };
      
      setResumenPeriodo(resumenGeneral);
      setDetalleInmuebles(inmueblesConCobros);
    } catch (err) {
      console.error('Error cargando datos del período:', err);
    }
  }

  async function fetchInmuebles() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/inmuebles', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInmuebles(data);
      }
    } catch (err) {
      console.error('Error fetching inmuebles:', err);
    }
  }

  async function fetchCobros(inmuebleId: number) {
    try {
      const token = localStorage.getItem('token');
      
      let url = `http://localhost:3000/api/cobros/inmueble/${inmuebleId}/filtrados`;
      const params = new URLSearchParams();
      
      if (dateFilters.desde) {
        params.append('desde', dateFilters.desde);
      }
      if (dateFilters.hasta) {
        params.append('hasta', dateFilters.hasta);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCobros(data);
        // Also fetch gastos for same period
        fetchGastos(inmuebleId);
      } else {
        const errorText = await res.text();
        console.error('Error fetching cobros:', errorText);
      }
    } catch (err) {
      console.error('Error fetching cobros:', err);
    }
  }

  async function fetchGastos(inmuebleId: number) {
    try {
      const token = localStorage.getItem('token');
      
      let url = `http://localhost:3000/api/gastos/inmueble/${inmuebleId}`;
      const params = new URLSearchParams();
      
      if (dateFilters.desde) {
        params.append('desde', dateFilters.desde);
      }
      if (dateFilters.hasta) {
        params.append('hasta', dateFilters.hasta);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setGastos(data);
      } else {
        const errorText = await res.text();
        console.error('Error fetching gastos:', errorText);
      }
    } catch (err) {
      console.error('Error fetching gastos:', err);
    }
  }

  async function fetchUltimoCobro(inmuebleId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/inmueble/${inmuebleId}/ultimo-cobro`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUltimoCobro(data);
      }
    } catch (err) {
      console.error('Error fetching ultimo cobro:', err);
    }
  }

  async function calcularVariacion(inmuebleId: number, montoActual: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/inmueble/${inmuebleId}/variacion?montoActual=${montoActual}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setVariacion(data.variacion);
      }
    } catch (err) {
      console.error('Error calculating variation:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/cobros', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inmuebleId: parseInt(formData.inmuebleId),
          periodo: formData.periodo,
          montoBruto: parseFloat(formData.montoBruto),
          fechaCobro: formData.fechaCobro ? new Date(formData.fechaCobro) : undefined
        })
      });
      
      if (res.ok) {
        setShowForm(false);
        setFormData({ inmuebleId: '', periodo: '', montoBruto: '', fechaCobro: '' });
        setVariacion(null);
        if (formData.inmuebleId) {
          fetchCobros(parseInt(formData.inmuebleId));
          fetchUltimoCobro(parseInt(formData.inmuebleId));
        }
        alert('Cobro registrado exitosamente');
      } else {
        const errorText = await res.text();
        console.error('Error creating cobro:', errorText);
        alert('Error al registrar cobro');
      }
    } catch (err) {
      console.error('Error creating cobro:', err);
      alert('Error al registrar cobro');
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

  function getMorosidadStatus(periodo: string) {
    const cobroDelPeriodo = cobros.find(c => c.periodo === periodo);
    return cobroDelPeriodo ? 'Pagado' : 'Mora';
  }

  async function generarReportePDF() {
    if (!periodoSeleccionado) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cobros/exportar-pdf?periodo=${periodoSeleccionado}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Cobros_Gastos_${periodoSeleccionado}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Error exporting PDF');
        alert('Error al generar PDF');
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al generar PDF');
    }
  }

  async function handleExportPDF() {
    if (!formData.inmuebleId) return;
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (dateFilters.desde) {
        params.append('desde', dateFilters.desde);
      }
      if (dateFilters.hasta) {
        params.append('hasta', dateFilters.hasta);
      }
      
      const url = `http://localhost:3000/api/cobros/inmueble/${formData.inmuebleId}/exportar-pdf?${params.toString()}`;
      
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `cobros-inmueble-${formData.inmuebleId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        alert('Error al generar PDF');
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al generar PDF');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-blue-600 hover:text-blue-700">
                ← Dashboard
              </a>
              <h1 className="text-xl font-bold text-gray-900">Reporte por Período</h1>
            </div>
            <div className="flex space-x-2">
              {resumenPeriodo && (
                <button
                  onClick={generarReportePDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Exportar PDF
                </button>
              )}
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showForm ? 'Cancelar' : 'Nuevo Cobro'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de período - principal */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Período</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes y Año</label>
            <input
              type="month"
              value={periodoSeleccionado}
              onChange={e => setPeriodoSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {periodoSeleccionado && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Mostrando datos del período: <strong>{(() => {
  const [year, month] = periodoSeleccionado.split('-');
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${monthNames[parseInt(month) - 1]} de ${year}`;
})()}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Formulario de nuevo cobro - ahora en la parte superior */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cargar Cobro de Alquiler</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inmueble</label>
                  <select
                    value={formData.inmuebleId}
                    onChange={e => setFormData({...formData, inmuebleId: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar inmueble</option>
                    {inmuebles.map((inmueble) => (
                      <option key={inmueble.id} value={inmueble.id}>
                        {inmueble.direccion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período (Mes/Año)</label>
                  <input
                    type="month"
                    value={formData.periodo}
                    onChange={e => setFormData({...formData, periodo: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cobro</label>
                  <input
                    type="date"
                    value={formData.fechaCobro}
                    onChange={e => setFormData({...formData, fechaCobro: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cobro'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dashboard resumen del período */}
        {resumenPeriodo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Cobrado (Período)</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(resumenPeriodo.totalCobros)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Gastos (Período)</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(resumenPeriodo.totalGastos)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saldo Neto (Período)</dt>
                    <dd className={`text-lg font-medium ${
                      resumenPeriodo.saldoNeto >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(resumenPeriodo.saldoNeto)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3v8m0 0v-1m0 1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Estado del Período</dt>
                    <dd className="text-lg font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resumenPeriodo.saldoNeto >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {resumenPeriodo.saldoNeto >= 0 ? 'Positivo' : 'Negativo'}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detalle de inmuebles del período */}
        {detalleInmuebles.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalle por Inmueble</h2>
            {detalleInmuebles.map((detalle, index) => (
              <div key={detalle.inmueble.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {detalle.inmueble.direccion}
                  </h3>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(detalle.totales.saldoNeto)}
                    </div>
                    <div className="text-sm text-gray-600">Saldo Neto</div>
                  </div>
                </div>

                {/* Tabs para cobros y gastos */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('cobros')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'cobros'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Cobros ({detalle.cobros.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('gastos')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'gastos'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Gastos ({detalle.gastos.length})
                    </button>
                  </nav>
                </div>

                {/* Lista de cobros */}
                {activeTab === 'cobros' && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Cobros del Período</h4>
                    {detalle.cobros.length === 0 ? (
                      <p className="text-gray-600">No hay cobros registrados para este inmueble en el período</p>
                    ) : (
                      <div className="space-y-3">
                        {detalle.cobros.map((cobro: any) => (
                          <div key={cobro.id} className="border border-gray-200 rounded-md p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  Período: {cobro.periodo}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Fecha: {new Date(cobro.fechaCobro).toLocaleDateString('es-AR')}
                                </div>
                                {cobro.distribuciones && cobro.distribuciones.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-sm font-medium text-gray-700">Distribución:</div>
                                    <div className="space-y-1">
                                      {cobro.distribuciones.map((dist: any) => (
                                        <div key={dist.id} className="flex justify-between text-sm">
                                          <span className="text-gray-600">
                                            {dist.propietario.nombre} ({dist.porcentaje}%):
                                          </span>
                                          <span className="font-medium text-gray-900">
                                            {formatCurrency(dist.monto)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(cobro.montoBruto)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Neto: {formatCurrency(cobro.montoNeto)}
                                </div>
                                {cobro.gastosTotal > 0 && (
                                  <div className="text-sm text-red-600">
                                    Gastos: {formatCurrency(cobro.gastosTotal)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de gastos */}
                {activeTab === 'gastos' && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Gastos del Período</h4>
                    {detalle.gastos.length === 0 ? (
                      <p className="text-gray-600">No hay gastos registrados para este inmueble en el período</p>
                    ) : (
                      <div className="space-y-3">
                        {detalle.gastos.map((gasto: any) => (
                          <div key={gasto.id} className="border border-gray-200 rounded-md p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {gasto.concepto}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Fecha: {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                                </div>
                                {gasto.descripcion && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {gasto.descripcion}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-red-600">
                                  {formatCurrency(gasto.monto)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        
        {periodoSeleccionado && (
          <>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Historial de Cobros</h2>
              {cobros.length === 0 ? (
                <p className="text-gray-600">No hay cobros registrados para este inmueble</p>
              ) : (
              <div className="space-y-4">
                {cobros.map((cobro) => {
                  const morosidadStatus = getMorosidadStatus(cobro.periodo);
                  
                  return (
                    <div key={cobro.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Período: {cobro.periodo}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Fecha: {new Date(cobro.fechaCobro).toLocaleDateString('es-AR')}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              morosidadStatus === 'Pagado' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {morosidadStatus}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(cobro.montoBruto)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Neto: {formatCurrency(cobro.montoNeto)}
                          </div>
                          {cobro.gastosTotal > 0 && (
                            <div className="text-sm text-red-600">
                              Gastos: {formatCurrency(cobro.gastosTotal)}
                            </div>
                          )}
                        </div>
                      </div>

                      {cobro.distribuciones && cobro.distribuciones.length > 0 && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-gray-700">Distribución por propietarios:</h4>
                            <button
                              onClick={() => {
                                const newCollapsed = new Set(collapsedCobros);
                                if (newCollapsed.has(cobro.id)) {
                                  newCollapsed.delete(cobro.id);
                                } else {
                                  newCollapsed.add(cobro.id);
                                }
                                setCollapsedCobros(newCollapsed);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              {collapsedCobros.has(cobro.id) ? '▶ Expandir' : '▼ Colapsar'}
                            </button>
                          </div>
                          {!collapsedCobros.has(cobro.id) && (
                            <div className="space-y-2">
                              {cobro.distribuciones.map((dist: any) => (
                                <div key={dist.id} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-700">
                                    {dist.propietario.nombre}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(dist.monto)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
