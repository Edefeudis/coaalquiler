'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFacturacionPage() {
  const [loading, setLoading] = useState(false);
  const [cobroId, setCobroId] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
  }, [router]);

  async function handleGenerarFactura() {
    if (!cobroId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/facturacion/cobro/${cobroId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Factura generada exitosamente');
      } else {
        alert('Error al generar factura');
      }
    } catch (err) {
      console.error('Error generating factura:', err);
      alert('Error al generar factura');
    }
  }

  async function handleReintentarPendientes() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/facturacion/reintentar-pendientes', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Reintento de facturas pendientes iniciado');
      } else {
        alert('Error al reintentar facturas');
      }
    } catch (err) {
      console.error('Error reintenting facturas:', err);
      alert('Error al reintentar facturas');
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
              <h1 className="text-xl font-bold text-gray-900">Gestión de Facturación</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Generar Factura para Cobro</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del Cobro</label>
              <input
                type="number"
                value={cobroId}
                onChange={e => setCobroId(e.target.value)}
                placeholder="Ej: 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGenerarFactura}
              disabled={!cobroId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generar Factura
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reintentar Facturas Pendientes</h2>
          <p className="text-gray-600 mb-4">
            Reintentar la generación de facturas que fallaron anteriormente.
          </p>
          <button
            onClick={handleReintentarPendientes}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Reintentar Pendientes
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Facturación</h2>
          <p className="text-gray-600 mb-6">
            Generación de facturas electrónicas y gestión de estados.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <p className="text-green-800">
              <strong>Estado:</strong> Funcionalidades disponibles
            </p>
            <ul className="text-green-700 text-sm mt-2 list-disc list-inside">
              <li>Generar facturas electrónicas</li>
              <li>Ver estado de facturas</li>
              <li>Reintentar facturas fallidas</li>
              <li>Gestionar estados de facturación</li>
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Endpoints disponibles:</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <code className="text-blue-600">POST /api/facturacion/cobro/:cobroId</code> - Generar factura
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <code className="text-blue-600">POST /api/facturacion/reintentar-pendientes</code> - Reintentar pendientes
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <code className="text-blue-600">GET /api/facturacion/cobro/:cobroId</code> - Ver factura
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
