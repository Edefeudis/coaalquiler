'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminGastosPage() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [editingGasto, setEditingGasto] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ concepto: '', monto: '', descripcion: '', fecha: '' });
  const [formData, setFormData] = useState({ inmuebleId: '', concepto: '', monto: '', descripcion: '', fecha: '' });
  const [collapsedGastos, setCollapsedGastos] = useState<Set<number>>(new Set());
  const [dateFilters, setDateFilters] = useState({ desde: '', hasta: '' });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchInmuebles();
  }, [router]);

  
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
        
        // Filtrar gastos por fecha en frontend
        let filteredData = data;
        if (dateFilters.desde || dateFilters.hasta) {
          filteredData = data.filter((gasto: any) => {
            const gastoDate = new Date(gasto.fecha);
            const desdeDate = dateFilters.desde ? new Date(dateFilters.desde) : null;
            const hastaDate = dateFilters.hasta ? new Date(dateFilters.hasta + 'T23:59:59.999') : null;
            
            if (desdeDate && gastoDate < desdeDate) return false;
            if (hastaDate && gastoDate > hastaDate) return false;
            return true;
          });
        }
        
        setGastos(filteredData);
      } else {
        const errorText = await res.text();
        console.error('Error fetching gastos:', errorText);
      }
    } catch (err) {
      console.error('Error fetching gastos:', err);
    }
  }

  function calcularPorcentajeGasto(gasto: any, inmueble: any) {
    if (!inmueble.propietarios || inmueble.propietarios.length === 0) {
      return [];
    }
    
    const montoNumerico = typeof gasto.monto === 'number' ? gasto.monto : parseFloat(gasto.monto);
    
    return inmueble.propietarios.map((rel: any) => {
      const montoPropietario = (montoNumerico * rel.porcentaje) / 100;
      return {
        propietarioId: rel.propietarioId,
        propietario: rel.propietario,
        porcentaje: rel.porcentaje,
        monto: montoPropietario
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/gastos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inmuebleId: parseInt(formData.inmuebleId),
          concepto: formData.concepto,
          monto: parseFloat(formData.monto),
          descripcion: formData.descripcion || undefined,
          fecha: formData.fecha || undefined
        })
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ inmuebleId: '', concepto: '', monto: '', descripcion: '', fecha: '' });
        if (formData.inmuebleId) {
          fetchGastos(parseInt(formData.inmuebleId));
        }
        alert('Gasto creado exitosamente');
      }
    } catch (err) {
      console.error('Error creating gasto:', err);
      alert('Error al crear gasto');
    }
  }

  async function handleUpdateGasto(gastoId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/gastos/${gastoId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingGasto(null);
        setEditForm({ concepto: '', monto: '', descripcion: '', fecha: '' });
        const selectedInmuebleId = inmuebles.find(i => i.id === parseInt(formData.inmuebleId))?.id;
        if (selectedInmuebleId) {
          fetchGastos(selectedInmuebleId);
        }
        alert('Gasto actualizado exitosamente');
      }
    } catch (err) {
      console.error('Error updating gasto:', err);
      alert('Error al actualizar gasto');
    }
  }

  async function handleDeleteGasto(gastoId: number) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/gastos/${gastoId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const selectedInmuebleId = inmuebles.find(i => i.id === parseInt(formData.inmuebleId))?.id;
        if (selectedInmuebleId) {
          fetchGastos(selectedInmuebleId);
        }
        alert('Gasto eliminado exitosamente');
      }
    } catch (err) {
      console.error('Error deleting gasto:', err);
      alert('Error al eliminar gasto');
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
              <h1 className="text-xl font-bold text-gray-900">Gestión de Gastos</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? 'Cancelar' : 'Nuevo Gasto'}
            </button>
          </div>
        </div>
      </nav>

      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de inmuebles - siempre visible */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Inmueble</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inmueble</label>
            <select
              value={formData.inmuebleId}
              onChange={e => {
                setFormData({...formData, inmuebleId: e.target.value});
                if (e.target.value) {
                  fetchGastos(parseInt(e.target.value));
                } else {
                  setGastos([]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar inmueble</option>
              {inmuebles.map((inmueble) => (
                <option key={inmueble.id} value={inmueble.id}>
                  {inmueble.direccion}
                  {inmueble.propietarios && inmueble.propietarios.length > 0 && 
                    ` - ${inmueble.propietarios.map((p: any) => p.propietario.nombre).join(', ')}`
                  }
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros de fecha por mes */}
        {formData.inmuebleId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Filtrar por Mes</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes y Año</label>
                <input
                  type="month"
                  value={dateFilters.desde ? dateFilters.desde.slice(0, 7) : ''}
                  onChange={e => {
                    const selectedDate = e.target.value;
                    if (selectedDate) {
                      // Calcular primer día del mes y último día del mes
                      const [year, month] = selectedDate.split('-');
                      const firstDay = `${year}-${month}-01`;
                      
                      // Calcular el último día real del mes
                      const lastDayOfMonth = new Date(year, month, 0).getDate();
                      const lastDay = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
                      
                      setDateFilters({ desde: firstDay, hasta: lastDay });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <div className="text-sm text-gray-600 mt-1">
                  {dateFilters.desde && dateFilters.hasta ? (
                    <span>
                      {new Date(dateFilters.desde).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })} - {new Date(dateFilters.hasta).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-gray-400">Selecciona un mes</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => {
                  if (dateFilters.desde && dateFilters.hasta && formData.inmuebleId) {
                    fetchGastos(parseInt(formData.inmuebleId));
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!dateFilters.desde || !dateFilters.hasta || !formData.inmuebleId}
              >
                Aplicar Filtro
              </button>
              <button
                onClick={() => {
                  setDateFilters({ desde: '', hasta: '' });
                  if (formData.inmuebleId) {
                    fetchGastos(parseInt(formData.inmuebleId));
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Limpiar Filtro
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Gasto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={e => setFormData({...formData, concepto: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={e => setFormData({...formData, monto: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha (opcional)</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={e => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Crear Gasto
              </button>
            </form>
          </div>
        )}

        {formData.inmuebleId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Gastos del Inmueble</h2>
            {gastos.length === 0 ? (
              <p className="text-gray-600">No hay gastos registrados para este inmueble</p>
            ) : (
              <div className="space-y-4">
                {gastos.map((gasto) => {
                  // Usar los datos del inmueble incluidos en el gasto, o buscar en la lista local
                  const inmuebleConPropietarios = gasto.inmueble || inmuebles.find(i => i.id === parseInt(formData.inmuebleId));
                  const distribucion = calcularPorcentajeGasto(gasto, inmuebleConPropietarios);
                  
                  return (
                    <div key={gasto.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{gasto.concepto}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                          </p>
                          {gasto.descripcion && (
                            <p className="text-sm text-gray-700 mt-1">{gasto.descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold text-gray-900">
                            ${typeof gasto.monto === 'number' ? gasto.monto.toFixed(2) : parseFloat(gasto.monto).toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingGasto(gasto.id);
                              setEditForm({
                                concepto: gasto.concepto,
                                monto: gasto.monto.toString(),
                                descripcion: gasto.descripcion || '',
                                fecha: new Date(gasto.fecha).toISOString().split('T')[0]
                              });
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteGasto(gasto.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {editingGasto === gasto.id && (
                        <div className="bg-blue-50 rounded-md p-4 mb-3">
                          <h4 className="text-sm font-semibold text-blue-900 mb-3">Editar Gasto</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Concepto</label>
                              <input
                                type="text"
                                value={editForm.concepto}
                                onChange={e => setEditForm({...editForm, concepto: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.monto}
                                onChange={e => setEditForm({...editForm, monto: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                              <textarea
                                value={editForm.descripcion}
                                onChange={e => setEditForm({...editForm, descripcion: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                              <input
                                type="date"
                                value={editForm.fecha}
                                onChange={e => setEditForm({...editForm, fecha: e.target.value})}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <button
                              onClick={() => handleUpdateGasto(gasto.id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingGasto(null);
                                setEditForm({ concepto: '', monto: '', descripcion: '', fecha: '' });
                              }}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {distribucion.length > 0 && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold text-gray-700">Distribución por propietarios:</h4>
                            <button
                              onClick={() => {
                                const newCollapsed = new Set(collapsedGastos);
                                if (newCollapsed.has(gasto.id)) {
                                  newCollapsed.delete(gasto.id);
                                } else {
                                  newCollapsed.add(gasto.id);
                                }
                                setCollapsedGastos(newCollapsed);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              {collapsedGastos.has(gasto.id) ? '▶ Expandir' : '▼ Colapsar'}
                            </button>
                          </div>
                          {!collapsedGastos.has(gasto.id) && (
                            <div className="space-y-2">
                              {distribucion.map((dist) => (
                                <div key={dist.propietarioId} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-700">
                                    {dist.propietario.nombre} ({dist.porcentaje}%)
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    ${typeof dist.monto === 'number' ? dist.monto.toFixed(2) : parseFloat(dist.monto).toFixed(2)}
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
        )}
      </div>
    </main>
  );
}
