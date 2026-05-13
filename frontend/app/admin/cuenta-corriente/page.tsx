'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCuentaCorrientePage() {
  const [loading, setLoading] = useState(false);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [selectedPropietario, setSelectedPropietario] = useState<number | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [showAjusteForm, setShowAjusteForm] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    propietarioId: '',
    monto: '',
    tipo: 'POSITIVO' as 'POSITIVO' | 'NEGATIVO',
    descripcion: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchPropietarios();
  }, [router]);

  async function fetchPropietarios() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/propietarios', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPropietarios(data);
      }
    } catch (err) {
      console.error('Error fetching propietarios:', err);
    }
  }

  async function fetchResumenPropietario(propietarioId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/resumen`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setResumen(data);
      }
    } catch (err) {
      console.error('Error fetching resumen:', err);
    }
  }

  async function fetchMovimientosPropietario(propietarioId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/movimientos`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      }
    } catch (err) {
      console.error('Error fetching movimientos:', err);
    }
  }

  async function handlePropietarioChange(propietarioId: string) {
    const id = parseInt(propietarioId);
    setSelectedPropietario(id);
    if (id) {
      fetchResumenPropietario(id);
      fetchMovimientosPropietario(id);
    } else {
      setResumen(null);
      setMovimientos([]);
    }
  }

  async function handleAjusteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/cuenta-corriente/ajuste', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propietarioId: parseInt(ajusteForm.propietarioId),
          monto: parseFloat(ajusteForm.monto),
          tipo: ajusteForm.tipo,
          descripcion: ajusteForm.descripcion
        })
      });
      
      if (res.ok) {
        setShowAjusteForm(false);
        setAjusteForm({
          propietarioId: '',
          monto: '',
          tipo: 'POSITIVO',
          descripcion: ''
        });
        
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
        }
        
        alert('Ajuste registrado exitosamente');
      } else {
        alert('Error al registrar ajuste');
      }
    } catch (err) {
      console.error('Error creating ajuste:', err);
      alert('Error al registrar ajuste');
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

  function getTipoMovimientoColor(tipo: string) {
    switch (tipo) {
      case 'CREDITO':
      case 'DISTRIBUCION':
      case 'AJUSTE_POSITIVO':
        return 'text-green-600';
      case 'DEBITO':
      case 'GASTO':
      case 'AJUSTE_NEGATIVO':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  function getTipoMovimientoIcon(tipo: string) {
    switch (tipo) {
      case 'CREDITO':
      case 'DISTRIBUCION':
      case 'AJUSTE_POSITIVO':
        return '↑';
      case 'DEBITO':
      case 'GASTO':
      case 'AJUSTE_NEGATIVO':
        return '↓';
      default:
        return '→';
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
              <h1 className="text-xl font-bold text-gray-900">Cuenta Corriente</h1>
            </div>
            <button
              onClick={() => setShowAjusteForm(!showAjusteForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showAjusteForm ? 'Cancelar' : 'Nuevo Ajuste'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de propietarios */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Propietario</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
            <select
              value={selectedPropietario || ''}
              onChange={e => handlePropietarioChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar propietario</option>
              {propietarios.map((propietario) => (
                <option key={propietario.id} value={propietario.id}>
                  {propietario.nombre} ({propietario.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulario de ajuste manual */}
        {showAjusteForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Ajuste Manual</h2>
            <form onSubmit={handleAjusteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                  <select
                    value={ajusteForm.propietarioId}
                    onChange={e => setAjusteForm({...ajusteForm, propietarioId: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar propietario</option>
                    {propietarios.map((propietario) => (
                      <option key={propietario.id} value={propietario.id}>
                        {propietario.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={ajusteForm.tipo}
                    onChange={e => setAjusteForm({...ajusteForm, tipo: e.target.value as 'POSITIVO' | 'NEGATIVO'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="POSITIVO">Ajuste Positivo</option>
                    <option value="NEGATIVO">Ajuste Negativo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ajusteForm.monto}
                    onChange={e => setAjusteForm({...ajusteForm, monto: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={ajusteForm.descripcion}
                    onChange={e => setAjusteForm({...ajusteForm, descripcion: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrar Ajuste'}
              </button>
            </form>
          </div>
        )}

        {/* Resumen de cuenta corriente */}
        {resumen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saldo General</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(resumen.saldoGeneral)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Propiedades</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {resumen.saldosPorInmueble.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Últimos Movimientos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {resumen.ultimosMovimientos.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movimientos */}
        {movimientos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Historial de Movimientos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movimiento.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getTipoMovimientoColor(movimiento.tipoMovimiento)}`}>
                          {getTipoMovimientoIcon(movimiento.tipoMovimiento)} {movimiento.tipoMovimiento}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movimiento.descripcion || movimiento.referencia || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTipoMovimientoColor(movimiento.tipoMovimiento)}`}>
                        {movimiento.tipoMovimiento.includes('POSITIVO') || movimiento.tipoMovimiento === 'CREDITO' || movimiento.tipoMovimiento === 'DISTRIBUCION' ? '+' : '-'}
                        {formatCurrency(movimiento.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(movimiento.saldoNuevo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
