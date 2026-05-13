'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Distribucion {
  id: number;
  propietario: { id: number; nombre: string; email: string };
  porcentaje: number;
  montoAsignado: number;
  gastosDeducidos: number;
  montoNeto: number;
}

interface Cobro {
  id: number;
  periodo: string;
  montoBruto: number;
  montoNeto: number;
  gastosTotal: number;
  estado: string;
  fechaCobro: string;
  distribuciones: Distribucion[];
}

interface Gasto {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
}

export default function InmuebleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/'); return; }

    Promise.all([
      fetch(`http://localhost:3000/api/cobros/inmueble/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`http://localhost:3000/api/gastos/inmueble/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
    ]).then(([c, g]) => {
      setCobros(c);
      setGastos(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Cargando...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <a
          href="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 font-medium"
        >
          ← Volver
        </a>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Detalle del Inmueble</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cobros</h2>
            {cobros.length === 0 ? (
              <p className="text-gray-500">No hay cobros registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Periodo</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Bruto</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Neto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobros.map(c => (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{c.periodo}</td>
                        <td className="py-3 px-4 text-right">${Number(c.montoBruto).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">${Number(c.montoNeto).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.estado === 'PAGADO' ? 'bg-green-100 text-green-800' :
                            c.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Gastos</h2>
            {gastos.length === 0 ? (
              <p className="text-gray-500">No hay gastos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Concepto</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map(g => (
                      <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(g.fecha).toLocaleDateString()}</td>
                        <td className="py-3 px-4">{g.concepto}</td>
                        <td className="py-3 px-4 text-right">${Number(g.monto).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
