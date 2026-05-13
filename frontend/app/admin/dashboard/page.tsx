'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/admin');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.nombre} ({user?.rol})
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  router.push('/admin');
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre}</h2>
          <p className="text-gray-600 mt-1">Rol: {user?.rol}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Propietarios</h3>
            <p className="text-gray-600 mb-4">Gestión de propietarios y sus inmuebles</p>
            <a
              href="/admin/propietarios"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Gestionar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inmuebles</h3>
            <p className="text-gray-600 mb-4">Administración de propiedades</p>
            <a
              href="/admin/inmuebles"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Gestionar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cobros</h3>
            <p className="text-gray-600 mb-4">Registro y distribución de cobros</p>
            <a
              href="/admin/cobros"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Gestionar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gastos</h3>
            <p className="text-gray-600 mb-4">Control de gastos por inmueble</p>
            <a
              href="/admin/gastos"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Gestionar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Facturación</h3>
            <p className="text-gray-600 mb-4">Generación de facturas electrónicas</p>
            <a
              href="/admin/facturacion"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Gestionar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Auditoría</h3>
            <p className="text-gray-600 mb-4">Historial de cambios y operaciones</p>
            <a
              href="/admin/auditoria"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
