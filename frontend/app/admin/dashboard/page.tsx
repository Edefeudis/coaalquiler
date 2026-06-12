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
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <p className="text-teal-600">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-[#F5F0EB]">Panel de Administración</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[#B8E6E6]">
                {user?.nombre} ({user?.rol})
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  router.push('/admin');
                }}
                className="px-3 py-2 bg-copper-400 hover:bg-copper-500 text-white rounded-md transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-teal-700">Bienvenido, {user?.nombre}</h2>
          <p className="text-teal-500 mt-1">Rol: {user?.rol}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Propietarios', desc: 'Gestión de propietarios y sus inmuebles', href: '/admin/propietarios', icon: '👥' },
            { title: 'Inmuebles', desc: 'Administración de propiedades', href: '/admin/inmuebles', icon: '🏠' },
            { title: 'Cobros', desc: 'Registro y distribución de cobros', href: '/admin/cobros', icon: '💰' },
            { title: 'Gastos', desc: 'Control de gastos por inmueble', href: '/admin/gastos', icon: '📋' },
            { title: 'Facturación', desc: 'Generación de facturas electrónicas', href: '/admin/facturacion', icon: '🧾' },
            { title: 'Cuenta Corriente', desc: 'Gestión de saldos y movimientos de propietarios', href: '/admin/cuenta-corriente', icon: '🏦' },
            { title: 'Auditoría', desc: 'Historial de cambios y operaciones', href: '/admin/auditoria', icon: '📝' },
            { title: 'Recibos', desc: 'Reimpresión de recibos de distribución por período', href: '/admin/recibos', icon: '📄' },
            { title: 'Usuarios', desc: 'Administración de usuarios del sistema', href: '/admin/usuarios', icon: '🔐' },
          ].map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg hover:ring-2 hover:ring-copper-300 transition-all border border-teal-100"
            >
              <div className="flex items-start space-x-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-teal-700 group-hover:text-copper-500 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-teal-500 mb-4 text-sm">{item.desc}</p>
                  <span className="inline-flex items-center text-copper-400 group-hover:text-copper-500 font-medium text-sm">
                    Gestionar →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}