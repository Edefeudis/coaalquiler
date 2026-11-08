'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, Wallet, ClipboardList, Receipt, Landmark, History, FileText,
  ShieldCheck, LogOut, ArrowRight, AlertTriangle, CheckCircle2, Clock, PiggyBank, type LucideIcon,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

type Modulo = { title: string; desc: string; href: string; icon: LucideIcon };

const GRUPOS: { titulo: string; modulos: Modulo[] }[] = [
  {
    titulo: 'Operación diaria',
    modulos: [
      { title: 'Cobros', desc: 'Registro y distribución de cobros', href: '/admin/cobros', icon: Wallet },
      { title: 'Gastos', desc: 'Control de gastos por inmueble', href: '/admin/gastos', icon: ClipboardList },
      { title: 'Cuenta Corriente', desc: 'Saldos, aportes y transferencias', href: '/admin/cuenta-corriente', icon: Landmark },
      { title: 'Recibos', desc: 'Reimpresión de recibos por período', href: '/admin/recibos', icon: FileText },
      { title: 'Fondo de reserva', desc: 'Inversión común, intereses y gastos', href: '/admin/fondo', icon: PiggyBank },
    ],
  },
  {
    titulo: 'Gestión',
    modulos: [
      { title: 'Propietarios', desc: 'Propietarios y sus inmuebles', href: '/admin/propietarios', icon: Users },
      { title: 'Inmuebles', desc: 'Administración de propiedades', href: '/admin/inmuebles', icon: Building2 },
      { title: 'Facturación', desc: 'Facturas electrónicas ARCA', href: '/admin/facturacion', icon: Receipt },
    ],
  },
  {
    titulo: 'Sistema',
    modulos: [
      { title: 'Usuarios', desc: 'Usuarios y permisos del sistema', href: '/admin/usuarios', icon: ShieldCheck },
      { title: 'Auditoría', desc: 'Historial de cambios y operaciones', href: '/admin/auditoria', icon: History },
    ],
  },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caja, setCaja] = useState<number | null>(null);
  const [saldos, setSaldos] = useState<{ id: number; nombre: string; saldo: number }[]>([]);
  const [cantInmuebles, setCantInmuebles] = useState<number | null>(null);
  const [fondo, setFondo] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      router.push('/admin');
      return;
    }
    if (userData) setUser(JSON.parse(userData));
    setLoading(false);
    cargarIndicadores(token);
  }, [router]);

  async function cargarIndicadores(token: string) {
    const headers = { Authorization: `Bearer ${token}` };
    const get = async (url: string) => {
      try {
        const r = await fetch(`${API}${url}`, { headers });
        return r.ok ? await r.json() : null;
      } catch {
        return null;
      }
    };

    const [cajaData, propietarios, inmuebles, fondoData] = await Promise.all([
      get('/cuenta-corriente/caja'),
      get('/propietarios'),
      get('/inmuebles'),
      get('/fondo/saldo'),
    ]);

    if (cajaData) setCaja(cajaData.caja);
    if (fondoData) setFondo(fondoData.saldo);
    if (Array.isArray(inmuebles)) setCantInmuebles(inmuebles.length);
    if (Array.isArray(propietarios)) {
      const lista = await Promise.all(
        propietarios.map(async (p: any) => {
          const s = await get(`/cuenta-corriente/propietario/${p.id}/saldo`);
          return { id: p.id, nombre: p.nombre, saldo: typeof s === 'number' ? s : 0 };
        }),
      );
      setSaldos(lista.sort((a, b) => b.saldo - a.saldo));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 rounded-full border-2 border-teal-200 border-t-teal-500 animate-spin" />
      </main>
    );
  }

  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombreCorto = user?.nombre?.split(' ')[0] || '';
  const maxAbs = Math.max(1, ...saldos.map(s => Math.abs(s.saldo)));
  const cajaNegativa = caja !== null && caja < -0.5;

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      {/* Encabezado */}
      <header className="bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-copper-400 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-[#F5F0EB]">CoaAlquiler</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
                  {nombreCorto.charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-medium">{user?.nombre}</p>
                  <p className="text-xs text-teal-100">{user?.rol}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  router.push('/admin');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-white/10 hover:bg-white/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </nav>

          <div className="pt-6 pb-20">
            <p className="text-teal-100 text-sm capitalize">{hoy}</p>
            <h1 className="text-3xl font-bold mt-1 text-[#F5F0EB]">{saludo}, {nombreCorto}</h1>
            <p className="text-teal-100 mt-1">Este es el estado de las propiedades hoy.</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-12">
        {/* Indicadores */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Caja */}
          <a
            href="/admin/cuenta-corriente"
            className={`rounded-xl p-6 shadow-md border bg-white hover:shadow-lg transition-shadow ${
              cajaNegativa ? 'border-copper-200' : 'border-teal-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Caja disponible</p>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cajaNegativa ? 'bg-copper-50' : 'bg-teal-50'}`}>
                <Landmark className={`h-5 w-5 ${cajaNegativa ? 'text-copper-500' : 'text-teal-500'}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold mt-3 tabular-nums ${cajaNegativa ? 'text-copper-600' : 'text-teal-700'}`}>
              {caja === null ? '—' : formatCurrency(caja)}
            </p>
            <p className={`text-xs mt-2 flex items-center gap-1 ${cajaNegativa ? 'text-copper-600' : 'text-gray-500'}`}>
              {cajaNegativa ? (
                <><AlertTriangle className="h-3.5 w-3.5" /> Faltan fondos: hay propietarios que deben aportar</>
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5 text-teal-400" /> Cobros + aportes − gastos − transferencias</>
              )}
            </p>
            <div className="flex gap-6 mt-5 pt-4 border-t border-gray-100 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Inmuebles</p>
                <p className="font-semibold text-teal-700">{cantInmuebles ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Propietarios</p>
                <p className="font-semibold text-teal-700">{saldos.length || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Fondo de reserva</p>
                <p className="font-semibold text-teal-700 tabular-nums">{fondo === null ? '—' : formatCurrency(fondo)}</p>
              </div>
            </div>
          </a>

          {/* Saldos por propietario */}
          <div className="lg:col-span-2 rounded-xl p-6 shadow-md border border-teal-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Saldo de cada propietario</p>
              <a href="/admin/cuenta-corriente" className="text-xs font-medium text-copper-500 hover:text-copper-600 flex items-center gap-1">
                Ver cuenta corriente <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            {saldos.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}
              </div>
            ) : (
              <ul className="space-y-3">
                {saldos.map(s => {
                  const positivo = s.saldo >= 0;
                  const ancho = `${(Math.abs(s.saldo) / maxAbs) * 50}%`;
                  return (
                    <li key={s.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
                      <span className="text-sm text-teal-700 truncate" title={s.nombre}>{s.nombre}</span>
                      {/* Barra centrada en cero: verde a la derecha (a favor), cobre a la izquierda (debe) */}
                      <div className="relative h-2.5 rounded-full bg-gray-100">
                        <div className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-gray-300" />
                        <div
                          className={`absolute top-0 h-full rounded-full ${positivo ? 'bg-teal-400' : 'bg-copper-400'}`}
                          style={positivo ? { left: '50%', width: ancho } : { right: '50%', width: ancho }}
                        />
                      </div>
                      <span className={`text-sm font-semibold tabular-nums text-right w-32 ${positivo ? 'text-teal-600' : 'text-copper-600'}`}>
                        {formatCurrency(s.saldo)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {caja !== null && saldos.some(s => s.saldo > 0.5) && caja < saldos.reduce((a, s) => a + Math.max(0, s.saldo), 0) - 0.5 && (
              <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Los saldos a favor que superan la caja quedan pendientes hasta que entren fondos.
              </p>
            )}
          </div>
        </section>

        {/* Módulos */}
        {GRUPOS.map(grupo => (
          <section key={grupo.titulo} className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{grupo.titulo}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {grupo.modulos.map(({ title, desc, href, icon: Icon }) => (
                <a
                  key={title}
                  href={href}
                  className="group relative rounded-xl bg-white p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-copper-200 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-teal-50 group-hover:bg-copper-50 flex items-center justify-center transition-colors">
                    <Icon className="h-5 w-5 text-teal-500 group-hover:text-copper-500 transition-colors" />
                  </div>
                  <h3 className="mt-4 font-semibold text-teal-700">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                  <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-300 group-hover:text-copper-400 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
