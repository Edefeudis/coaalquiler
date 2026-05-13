'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminInmueblesPage() {
  const [loading, setLoading] = useState(false);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAddPropietario, setShowAddPropietario] = useState(false);
  const [editingInmueble, setEditingInmueble] = useState<number | null>(null);
  const [editingPorcentaje, setEditingPorcentaje] = useState<{inmuebleId: number, propietarioId: number} | null>(null);
  const [selectedInmueble, setSelectedInmueble] = useState<any>(null);
  const [formData, setFormData] = useState({ direccion: '' });
  const [editForm, setEditForm] = useState({ direccion: '' });
  const [porcentajeForm, setPorcentajeForm] = useState({ porcentaje: '' });
  const [propietarioForm, setPropietarioForm] = useState({ propietarioId: '', porcentaje: '' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const propietarioIdParam = searchParams.get('propietarioId');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchInmuebles();
    fetchPropietarios();
  }, [router]);

  async function fetchInmuebles() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  async function fetchPropietarios() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/propietarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPropietarios(data);
      }
    } catch (err) {
      console.error('Error fetching propietarios:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/inmuebles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ direccion: '' });
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error creating inmueble:', err);
      alert('Error al crear inmueble');
    }
  }

  async function handleDeleteInmueble(id: number) {
    if (!confirm('¿Estás seguro de eliminar este inmueble?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/inmuebles/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error deleting inmueble:', err);
      alert('Error al eliminar inmueble');
    }
  }

  async function handleAddPropietario(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInmueble) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/inmuebles/${selectedInmueble.id}/propietario/${propietarioForm.propietarioId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ porcentaje: parseFloat(propietarioForm.porcentaje) })
      });
      if (res.ok) {
        setShowAddPropietario(false);
        setPropietarioForm({ propietarioId: '', porcentaje: '' });
        setSelectedInmueble(null);
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error adding propietario:', err);
      alert('Error al agregar propietario');
    }
  }

  async function handleRemovePropietario(inmuebleId: number, propietarioId: number) {
    if (!confirm('¿Estás seguro de eliminar este propietario del inmueble?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/inmuebles/${inmuebleId}/propietario/${propietarioId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error removing propietario:', err);
      alert('Error al eliminar propietario');
    }
  }

  async function handleUpdateInmueble(id: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/inmuebles/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingInmueble(null);
        setEditForm({ direccion: '' });
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error updating inmueble:', err);
      alert('Error al actualizar inmueble');
    }
  }

  async function handleUpdatePorcentaje(inmuebleId: number, propietarioId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/inmuebles/${inmuebleId}/propietario/${propietarioId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ porcentaje: parseFloat(porcentajeForm.porcentaje) })
      });
      if (res.ok) {
        setEditingPorcentaje(null);
        setPorcentajeForm({ porcentaje: '' });
        fetchInmuebles();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error updating porcentaje:', err);
      alert('Error al actualizar porcentaje');
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
              <h1 className="text-xl font-bold text-gray-900">Gestión de Inmuebles</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? 'Cancelar' : 'Nuevo Inmueble'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Inmueble</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Guardar
              </button>
            </form>
          </div>
        )}

        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lista de Inmuebles</h2>
          
          {loading ? (
            <p className="text-gray-600">Cargando...</p>
          ) : inmuebles.length === 0 ? (
            <p className="text-gray-600">No hay inmuebles registrados</p>
          ) : (
            <div className="space-y-4">
              {inmuebles.map((inmueble) => (
                <div key={inmueble.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {editingInmueble === inmueble.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editForm.direccion}
                            onChange={e => setEditForm({ direccion: e.target.value })}
                            className="text-lg font-semibold border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleUpdateInmueble(inmueble.id)}
                            className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditingInmueble(null);
                              setEditForm({ direccion: '' });
                            }}
                            className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{inmueble.direccion}</h3>
                          <button
                            onClick={() => {
                              setEditingInmueble(inmueble.id);
                              setEditForm({ direccion: inmueble.direccion });
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-gray-600">ID: {inmueble.id}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteInmueble(inmueble.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar Inmueble
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Propietarios:</h4>
                      <button
                        onClick={() => {
                          setSelectedInmueble(inmueble);
                          setShowAddPropietario(!showAddPropietario || selectedInmueble?.id !== inmueble.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {showAddPropietario && selectedInmueble?.id === inmueble.id ? '- Cancelar' : '+ Agregar Propietario'}
                      </button>
                    </div>
                    
                    {showAddPropietario && selectedInmueble?.id === inmueble.id && (
                      <div className="bg-blue-50 rounded-md p-4 mb-4">
                        <h5 className="text-sm font-semibold text-blue-900 mb-3">Agregar propietario a {inmueble.direccion}</h5>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleAddPropietario(e);
                        }} className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Propietario</label>
                            <select
                              value={propietarioForm.propietarioId}
                              onChange={e => setPropietarioForm({...propietarioForm, propietarioId: e.target.value})}
                              required
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Seleccionar propietario</option>
                              {propietarios.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.email})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Porcentaje (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={propietarioForm.porcentaje}
                              onChange={e => setPropietarioForm({...propietarioForm, porcentaje: e.target.value})}
                              required
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Agregar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddPropietario(false);
                                setSelectedInmueble(null);
                                setPropietarioForm({ propietarioId: '', porcentaje: '' });
                              }}
                              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    
                    {inmueble.propietarios && inmueble.propietarios.length > 0 ? (
                      <div className="bg-gray-50 rounded-md p-3">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Porcentaje</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inmueble.propietarios.map((rel: any) => (
                              <tr key={rel.propietarioId}>
                                <td className="py-2 text-sm text-gray-900">{rel.propietario.nombre}</td>
                                <td className="py-2 text-sm text-gray-900">{rel.propietario.email}</td>
                                <td className="py-2 text-sm text-gray-900">
                                  {editingPorcentaje?.inmuebleId === inmueble.id && editingPorcentaje?.propietarioId === rel.propietarioId ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={porcentajeForm.porcentaje}
                                        onChange={e => setPorcentajeForm({ porcentaje: e.target.value })}
                                        className="w-20 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                      <button
                                        onClick={() => handleUpdatePorcentaje(inmueble.id, rel.propietarioId)}
                                        className="px-1 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingPorcentaje(null);
                                          setPorcentajeForm({ porcentaje: '' });
                                        }}
                                        className="px-1 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                      >
                                        ✗
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span>{rel.porcentaje}%</span>
                                      <button
                                        onClick={() => {
                                          setEditingPorcentaje({ inmuebleId: inmueble.id, propietarioId: rel.propietarioId });
                                          setPorcentajeForm({ porcentaje: rel.porcentaje.toString() });
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-xs"
                                      >
                                        Editar
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={() => handleRemovePropietario(inmueble.id, rel.propietarioId)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Sin propietarios asignados</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
