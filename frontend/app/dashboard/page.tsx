'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Inmueble {
  id: number;
  direccion: string;
  porcentaje: number;
}

export default function DashboardPage() {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }

    fetch('http://localhost:3000/api/auth/inmuebles', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setInmuebles(data.map((r: any) => ({
          id: r.inmueble.id,
          direccion: r.inmueble.direccion,
          porcentaje: r.porcentaje
        })));
        setLoading(false);
      })
      .catch(() => { setError('Error al cargar inmuebles'); setLoading(false); });
  }, [router]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Cargando...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Inmuebles</h1>
          <button
            onClick={() => { localStorage.removeItem('token'); router.push('/'); }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cerrar sesión
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {inmuebles.map(i => (
            <div
              key={i.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{i.direccion}</h3>
              <p className="text-gray-600 mb-4">Participación: <span className="font-semibold">{i.porcentaje}%</span></p>
              <a
                href={`/inmueble/${i.id}`}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver detalle →
              </a>
            </div>
          ))}
        </div>

        {inmuebles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tienes inmuebles asignados</p>
          </div>
        )}
      </div>
    </main>
  );
}
