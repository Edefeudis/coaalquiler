'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAuditoriaPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-blue-600 hover:text-blue-700">
                ← Dashboard
              </a>
              <h1 className="text-xl font-bold text-gray-900">Historial de Auditoría</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Auditoría</h2>
          <p className="text-gray-600 mb-6">
            Historial de cambios, operaciones y bitácora de actividades del sistema.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800">
              <strong>Estado:</strong> Controlador no implementado
            </p>
            <p className="text-yellow-700 text-sm mt-2">
              El modelo LogAuditoria existe en la base de datos pero no hay un controlador específico en el backend.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del modelo:</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-gray-700 text-sm mb-2">
                <strong>Modelo:</strong> LogAuditoria
              </p>
              <p className="text-gray-700 text-sm mb-2">
                <strong>Campos disponibles:</strong>
              </p>
              <ul className="text-gray-600 text-sm list-disc list-inside">
                <li>id, entidad, entidadId, accion</li>
                <li>usuarioId, usuarioRol</li>
                <li>datosPrevios, datosNuevos</li>
                <li>createdAt</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Próximos pasos:</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-blue-700 text-sm">
                Para implementar esta funcionalidad, se necesita crear un controlador AuditoriaController con endpoints para:
              </p>
              <ul className="text-blue-700 text-sm list-disc list-inside mt-2">
                <li>Ver historial de auditoría</li>
                <li>Filtrar por entidad, usuario o fecha</li>
                <li>Ver detalles de cambios específicos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
