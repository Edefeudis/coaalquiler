'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Inmueble {
  id: number;
  direccion: string;
}

interface Cobro {
  id: number;
  inmuebleId: number;
  periodo: string;
  montoBruto: number;
  montoNeto: number;
  gastosTotal: number;
  fechaCobro: string;
  inmueble: Inmueble;
}

interface Gasto {
  id: number;
  inmuebleId: number;
  concepto: string;
  monto: number;
  fecha: string;
}

export default function AdminCobrosNuevoPage() {
  const [loading, setLoading] = useState(false);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [selectedInmueble, setSelectedInmueble] = useState<number>('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [periodoConsulta, setPeriodoConsulta] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    inmuebleId: '',
    periodo: '',
    montoBruto: '',
    fechaCobro: ''
  });

  const router = useRouter();

  // Obtener fecha actual para valores por defecto
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const defaultPeriodo = `${currentYear}-${currentMonth}`;
    const defaultFecha = today.toISOString().split('T')[0];
    
    setPeriodoConsulta(defaultPeriodo);
    setSelectedPeriodo(defaultPeriodo);
    setFormData(prev => ({
      ...prev,
      periodo: defaultPeriodo,
      fechaCobro: defaultFecha
    }));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchInmuebles();
  }, [router]);

  useEffect(() => {
    if (selectedInmueble) {
      fetchCobrosByPeriodo();
      fetchGastosByPeriodo();
    }
  }, [selectedInmueble, selectedPeriodo]);

  async function fetchInmuebles() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/inmuebles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInmuebles(data);
      }
    } catch (err) {
      console.error('Error fetching inmuebles:', err);
    }
  }

  async function fetchCobrosByPeriodo() {
    if (!selectedInmueble || !selectedPeriodo) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Calcular fechas del período
      const [year, month] = selectedPeriodo.split('-');
      const primerDia = `${year}-${month}-01`;
      const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate();
      const ultimoDiaStr = `${year}-${month}-${ultimoDia.toString().padStart(2, '0')}`;
      
      const res = await fetch(
        `http://localhost:3000/api/cobros/inmueble/${selectedInmueble}/filtrados?desde=${primerDia}&hasta=${ultimoDiaStr}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setCobros(data);
      } else {
        console.error('Error fetching cobros:', await res.text());
      }
    } catch (err) {
      console.error('Error fetching cobros:', err);
    }
  }

  async function fetchGastosByPeriodo() {
    if (!selectedInmueble || !selectedPeriodo) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Calcular fechas del período
      const [year, month] = selectedPeriodo.split('-');
      const primerDia = `${year}-${month}-01`;
      const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate();
      const ultimoDiaStr = `${year}-${month}-${ultimoDia.toString().padStart(2, '0')}`;
      
      const res = await fetch(
        `http://localhost:3000/api/gastos/inmueble/${selectedInmueble}?desde=${primerDia}&hasta=${ultimoDiaStr}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setGastos(data);
      } else {
        console.error('Error fetching gastos:', await res.text());
      }
    } catch (err) {
      console.error('Error fetching gastos:', err);
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
        alert('Cobro registrado exitosamente');
        setShowForm(false);
        setFormData({
          inmuebleId: '',
          periodo: '',
          montoBruto: '',
          fechaCobro: ''
        });
        
        // Recargar datos
        fetchCobrosByPeriodo();
        fetchGastosByPeriodo();
      } else {
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

  function getMorosidadStatus() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentPeriodo = `${currentYear}-${currentMonth}`;
    
    if (selectedPeriodo === currentPeriodo) {
      return cobros.length === 0 ? 'Sin cobros registrados' : 'Pagado';
    } else {
      return cobros.length === 0 ? 'Mora' : 'Pagado';
    }
  }

  function getMorosidadColor() {
    const status = getMorosidadStatus();
    if (status === 'Mora') return 'text-red-600 bg-red-50';
    if (status === 'Sin cobros registrados') return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
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
              <h1 className="text-xl font-bold text-gray-900">Gestión de Cobros</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Panel de selección y consulta */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Consulta de Cobros y Gastos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Selector de inmueble */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inmueble</label>
              <select
                value={selectedInmueble}
                onChange={e => setSelectedInmueble(parseInt(e.target.value))}
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

            {/* Selector de período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período (YYYY-MM)</label>
              <input
                type="month"
                value={periodoConsulta}
                onChange={e => {
                  setPeriodoConsulta(e.target.value);
                  setSelectedPeriodo(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botón de acciones */}
            <div className="flex items-end">
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={!selectedInmueble}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showForm ? 'Cancelar' : 'Nuevo Cobro'}
              </button>
            </div>
          </div>

          {/* Indicador de morosidad */}
          {selectedInmueble && (
            <div className={`p-4 rounded-md ${getMorosidadColor()}`}>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 0 8 8 0 0116 0zm-1-13a1 1 0 00-1 1v3a1 1 0 002 0v3a1 1 0 002 0v6a1 1 0 01-2 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  Estado: {getMorosidadStatus()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Formulario de nuevo cobro */}
        {showForm && selectedInmueble && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Nuevo Cobro</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <input
                    type="month"
                    value={formData.periodo}
                    onChange={e => setFormData({...formData, periodo: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Bruto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montoBruto}
                    onChange={e => setFormData({...formData, montoBruto: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cobro</label>
                <input
                  type="date"
                  value={formData.fechaCobro}
                  onChange={e => setFormData({...formData, fechaCobro: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrar Cobro'}
              </button>
            </form>
          </div>
        )}

        {/* Resumen del período */}
        {selectedInmueble && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 3-2 3-3-2-3m0 0c1.11 0 2.08.402 2.599 1M12 8V7m0 1l3 3m-3-3h6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Cobrado</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(cobros.reduce((sum, cobro) => sum + cobro.montoBruto, 0))}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Gastos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(gastos.reduce((sum, gasto) => sum + gasto.monto, 0))}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4m6 4a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saldo Neto</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        cobros.reduce((sum, cobro) => sum + cobro.montoNeto, 0) - 
                        gastos.reduce((sum, gasto) => sum + gasto.monto, 0)
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de cobros */}
        {cobros.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cobros del Período</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bruto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gastos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Neto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cobros.map((cobro) => (
                    <tr key={cobro.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cobro.periodo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(cobro.montoBruto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(cobro.gastosTotal || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(cobro.montoNeto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(cobro.fechaCobro).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        {gastos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Gastos del Período</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gastos.map((gasto) => (
                    <tr key={gasto.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.concepto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(gasto.monto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay datos */}
        {selectedInmueble && cobros.length === 0 && gastos.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707L19.586 7.414A1 1 0 0120 8.586V17a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No hay datos para mostrar</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron cobros ni gastos para el período seleccionado.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
