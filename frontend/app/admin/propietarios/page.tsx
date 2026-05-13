'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPropietariosPage() {
  const [loading, setLoading] = useState(false);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '' });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token en useEffect:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchPropietarios();
  }, [router]);

  async function fetchPropietarios() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token en fetchPropietarios:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('Authorization header:', `Bearer ${token}`);
      const res = await fetch('http://localhost:3000/api/propietarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        setPropietarios(data);
      } else {
        const errorText = await res.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Error fetching propietarios:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      console.log('Token en handleSubmit:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('FormData:', formData);
      const res = await fetch('http://localhost:3000/api/propietarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      console.log('Response status:', res.status);
      if (res.ok) {
        setShowForm(false);
        setFormData({ nombre: '', email: '' });
        fetchPropietarios();
      } else {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error creating propietario:', err);
      alert('Error al crear propietario');
    }
  }

  async function handleDeletePropietario(id: number) {
    if (!confirm('¿Estás seguro de eliminar este propietario?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/propietarios/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchPropietarios();
      } else {
        const errorText = await res.text();
        alert(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error deleting propietario:', err);
      alert('Error al eliminar propietario');
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
              <h1 className="text-xl font-bold text-gray-900">Gestión de Propietarios</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showForm ? 'Cancelar' : 'Nuevo Propietario'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Propietario</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lista de Propietarios</h2>
          
          {loading ? (
            <p className="text-gray-600">Cargando...</p>
          ) : propietarios.length === 0 ? (
            <p className="text-gray-600">No hay propietarios registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {propietarios.map((propietario) => (
                    <tr key={propietario.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{propietario.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{propietario.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{propietario.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <a 
                          href={`/admin/inmuebles?propietarioId=${propietario.id}`}
                          className="text-blue-600 hover:text-blue-700 mr-4"
                        >
                          Ver Inmuebles
                        </a>
                        <button 
                          onClick={() => handleDeletePropietario(propietario.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
