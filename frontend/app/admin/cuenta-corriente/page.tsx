'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Landmark, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, Plus, X, Trash2, ChevronRight, Wallet, Receipt, PiggyBank, Send,
  type LucideIcon,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

type FilaResumen = {
  propietario: { id: number; nombre: string; email: string };
  cantidadInmuebles: number;
  cobros: number; gastos: number; aportes: number; retiros: number; ajustes: number;
  saldo: number; transferible: number; pendienteDeCobro: number;
};
type ResumenGeneral = {
  caja: { caja: number; totalCobros: number; totalAportes: number; totalGastos: number; totalRetiros: number };
  propietarios: FilaResumen[];
  totales: { aFavor: number; adeudado: number; saldoNeto: number };
};

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const fmt0 = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'UTC' });
const EPS = 0.5;

const TIPOS: Record<string, { label: string; credito: boolean; cls: string }> = {
  CREDITO: { label: 'Cobro', credito: true, cls: 'bg-teal-50 text-teal-700' },
  DISTRIBUCION: { label: 'Distribución', credito: true, cls: 'bg-teal-50 text-teal-700' },
  APORTE: { label: 'Aporte', credito: true, cls: 'bg-aqua-100 text-teal-700' },
  AJUSTE_POSITIVO: { label: 'Ajuste +', credito: true, cls: 'bg-gray-100 text-gray-700' },
  GASTO: { label: 'Gasto', credito: false, cls: 'bg-copper-50 text-copper-600' },
  DEBITO: { label: 'Transferencia', credito: false, cls: 'bg-copper-100 text-copper-700' },
  AJUSTE_NEGATIVO: { label: 'Ajuste −', credito: false, cls: 'bg-gray-100 text-gray-700' },
};

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'CREDITO', label: 'Cobros' },
  { key: 'GASTO', label: 'Gastos' },
  { key: 'APORTE', label: 'Aportes' },
  { key: 'DEBITO', label: 'Transferencias' },
];

function estadoDe(f: { saldo: number; transferible: number; pendienteDeCobro: number }) {
  if (f.saldo < -EPS) return { label: 'Debe aportar', cls: 'bg-copper-50 text-copper-600 border-copper-200', icon: AlertTriangle };
  if (f.transferible > EPS) return { label: 'Para transferir', cls: 'bg-teal-50 text-teal-700 border-teal-200', icon: Send };
  if (f.pendienteDeCobro > EPS) return { label: 'Pendiente sin fondos', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock };
  return { label: 'Al día', cls: 'bg-gray-50 text-gray-600 border-gray-200', icon: CheckCircle2 };
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-300 focus:border-copper-300 text-gray-900 bg-white';

export default function AdminCuentaCorrientePage() {
  const router = useRouter();
  const [general, setGeneral] = useState<ResumenGeneral | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [loading, setLoading] = useState(false);

  // Formulario de transferencia / aporte
  const [showForm, setShowForm] = useState(false);
  const [tipoForm, setTipoForm] = useState<'DEBITO' | 'APORTE'>('DEBITO');
  const [form, setForm] = useState({ monto: '', descripcion: '' });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/admin');
      return;
    }
    fetchGeneral();
  }, [router]);

  function headers(json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function fetchGeneral() {
    try {
      const res = await fetch(`${API}/cuenta-corriente/resumen-general`, { headers: headers() });
      if (res.ok) setGeneral(await res.json());
    } catch (err) {
      console.error('Error fetching resumen general:', err);
    }
  }

  async function fetchPropietario(id: number) {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/cuenta-corriente/propietario/${id}/resumen`, { headers: headers() }),
        fetch(`${API}/cuenta-corriente/propietario/${id}/movimientos`, { headers: headers() }),
      ]);
      if (r1.ok) setDetalle(await r1.json());
      if (r2.ok) setMovimientos(await r2.json());
    } catch (err) {
      console.error('Error fetching propietario:', err);
    }
  }

  function seleccionar(id: number | null) {
    setSelectedId(id);
    setShowForm(false);
    setFiltroTipo('todos');
    setDetalle(null);
    setMovimientos([]);
    if (id) fetchPropietario(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const fila = general?.propietarios.find(p => p.propietario.id === selectedId) || null;
  const caja = general?.caja.caja ?? 0;
  const transferible = fila?.transferible ?? 0;

  function abrirForm(tipo: 'DEBITO' | 'APORTE') {
    setTipoForm(tipo);
    setForm({ monto: tipo === 'DEBITO' && transferible > 0 ? transferible.toFixed(2) : '', descripcion: '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/cuenta-corriente/movimiento`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({
          propietarioId: selectedId,
          tipoMovimiento: tipoForm,
          monto: Math.abs(parseFloat(form.monto)),
          descripcion: form.descripcion || (tipoForm === 'APORTE' ? 'Aporte para gastos' : 'Transferencia al propietario'),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        await Promise.all([fetchGeneral(), fetchPropietario(selectedId)]);
      } else {
        let msg = 'Error al registrar el movimiento';
        try { const err = await res.json(); if (err?.message) msg = err.message; } catch {}
        alert(msg);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  }

  async function eliminarMovimiento(mov: any) {
    const tipo = TIPOS[mov.tipoMovimiento]?.label.toLowerCase() || 'movimiento';
    if (!confirm(`¿Eliminar ${tipo} de ${fmt(mov.monto)} del ${fmtFecha(mov.fecha)}?`)) return;
    try {
      const res = await fetch(`${API}/cuenta-corriente/movimiento/${mov.referenciaId}`, { method: 'DELETE', headers: headers() });
      if (res.ok) {
        await Promise.all([fetchGeneral(), selectedId ? fetchPropietario(selectedId) : null]);
      } else {
        alert(`Error: ${await res.text()}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  const movFiltrados = useMemo(
    () => movimientos.filter(m =>
      filtroTipo === 'todos' ? true
        : filtroTipo === 'CREDITO' ? ['CREDITO', 'DISTRIBUCION'].includes(m.tipoMovimiento)
        : m.tipoMovimiento === filtroTipo),
    [movimientos, filtroTipo],
  );

  const cajaNegativa = caja < -EPS;
  const maxAbs = Math.max(1, ...(general?.propietarios.map(p => Math.abs(p.saldo)) || [1]));

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <a href="/admin/dashboard" className="flex items-center gap-1 text-[#B8E6E6] hover:text-white transition-colors text-sm shrink-0">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB] truncate">
                Cuenta Corriente{fila ? <span className="font-normal text-[#B8E6E6]"> · {fila.propietario.nombre}</span> : null}
              </h1>
            </div>
            <select
              value={selectedId ?? ''}
              onChange={e => seleccionar(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-copper-300"
            >
              <option value="" className="text-black">Todos los propietarios</option>
              {general?.propietarios.map(p => (
                <option key={p.propietario.id} value={p.propietario.id} className="text-black">{p.propietario.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!general ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : !selectedId ? (
          /* ───────────── RESUMEN GENERAL ───────────── */
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                titulo="Caja disponible" valor={caja} icon={Landmark} tono={cajaNegativa ? 'copper' : 'teal'}
                nota={cajaNegativa ? 'Faltan fondos para cubrir los gastos' : 'Plata disponible para transferir'}
              />
              <Kpi titulo="Saldos a favor" valor={general.totales.aFavor} icon={TrendingUp} tono="teal" nota="Lo que la caja les debe a los propietarios" />
              <Kpi titulo="Saldos adeudados" valor={general.totales.adeudado} icon={TrendingDown} tono="copper" nota="Lo que los propietarios deben aportar" />
              <Kpi
                titulo="Pendiente sin fondos" icon={Clock} tono="amber"
                valor={general.propietarios.reduce((s, p) => s + p.pendienteDeCobro, 0)}
                nota="Saldo a favor que no se puede transferir hoy"
              />
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-teal-700">Saldos de todos los propietarios</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Saldo = su parte de cobros − su parte de gastos + aportes − transferencias ± ajustes</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3 font-medium">Propietario</th>
                      <th className="px-3 py-3 font-medium text-right">Cobros</th>
                      <th className="px-3 py-3 font-medium text-right">Gastos</th>
                      <th className="px-3 py-3 font-medium text-right">Aportes</th>
                      <th className="px-3 py-3 font-medium text-right">Transferido</th>
                      <th className="px-3 py-3 font-medium text-right">Saldo</th>
                      <th className="px-3 py-3 font-medium w-44 hidden lg:table-cell"></th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {general.propietarios.map(p => {
                      const est = estadoDe(p);
                      const positivo = p.saldo >= 0;
                      const ancho = `${(Math.abs(p.saldo) / maxAbs) * 50}%`;
                      return (
                        <tr key={p.propietario.id} onClick={() => seleccionar(p.propietario.id)} className="group cursor-pointer hover:bg-gray-50/70">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-semibold">
                                {p.propietario.nombre.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-teal-700 truncate">{p.propietario.nombre}</p>
                                <p className="text-xs text-gray-400 truncate">{p.cantidadInmuebles} inmuebles · {p.propietario.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600">{fmt0(p.cobros)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600">−{fmt0(p.gastos)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600">{p.aportes > 0 ? `+${fmt0(p.aportes)}` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600">{p.retiros > 0 ? `−${fmt0(p.retiros)}` : '—'}</td>
                          <td className={`px-3 py-3 text-right tabular-nums font-bold ${positivo ? 'text-teal-600' : 'text-copper-600'}`}>{fmt(p.saldo)}</td>
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <div className="relative h-2 rounded-full bg-gray-100">
                              <div className="absolute left-1/2 -top-1 -bottom-1 w-px bg-gray-300" />
                              <div
                                className={`absolute top-0 h-full rounded-full ${positivo ? 'bg-teal-400' : 'bg-copper-400'}`}
                                style={positivo ? { left: '50%', width: ancho } : { right: '50%', width: ancho }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${est.cls}`}>
                              <est.icon className="h-3 w-3" /> {est.label}
                            </span>
                          </td>
                          <td className="pr-3"><ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-copper-400" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-700">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt0(general.propietarios.reduce((s, p) => s + p.cobros, 0))}</td>
                      <td className="px-3 py-3 text-right tabular-nums">−{fmt0(general.propietarios.reduce((s, p) => s + p.gastos, 0))}</td>
                      <td className="px-3 py-3 text-right tabular-nums">+{fmt0(general.propietarios.reduce((s, p) => s + p.aportes, 0))}</td>
                      <td className="px-3 py-3 text-right tabular-nums">−{fmt0(general.propietarios.reduce((s, p) => s + p.retiros, 0))}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${general.totales.saldoNeto >= 0 ? 'text-teal-700' : 'text-copper-600'}`}>{fmt(general.totales.saldoNeto)}</td>
                      <td colSpan={3} className="px-3 py-3 text-xs font-normal text-gray-500">
                        {Math.abs(general.totales.saldoNeto - caja) < 1
                          ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500" /> Coincide con la caja</span>
                          : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Difiere de la caja ({fmt(caja)}) por ajustes manuales</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        ) : (
          /* ───────────── DETALLE DE UN PROPIETARIO ───────────── */
          fila && (
            <>
              <button onClick={() => seleccionar(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600">
                <ArrowLeft className="h-4 w-4" /> Volver al resumen
              </button>

              {/* Cabecera */}
              {(() => {
                const est = estadoDe(fila);
                return (
                  <section className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="p-6 flex flex-wrap gap-6 justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-teal-600 text-white text-xl font-bold flex items-center justify-center">
                          {fila.propietario.nombre.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-teal-700">{fila.propietario.nombre}</h2>
                          <p className="text-sm text-gray-500">{fila.propietario.email}</p>
                          <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full border text-xs font-medium ${est.cls}`}>
                            <est.icon className="h-3 w-3" /> {est.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Saldo del propietario</p>
                        <p className={`text-4xl font-bold tabular-nums ${fila.saldo >= 0 ? 'text-teal-700' : 'text-copper-600'}`}>{fmt(fila.saldo)}</p>
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => abrirForm('APORTE')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100"
                          >
                            <ArrowDownLeft className="h-4 w-4" /> Registrar aporte
                          </button>
                          <button
                            onClick={() => abrirForm('DEBITO')}
                            disabled={transferible <= 0}
                            title={transferible <= 0 ? 'No hay monto transferible' : ''}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-copper-400 hover:bg-copper-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ArrowUpRight className="h-4 w-4" /> Transferir {transferible > 0 ? fmt0(transferible) : ''}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={`px-6 py-3 text-sm border-t flex flex-wrap gap-x-8 gap-y-1 ${
                      fila.saldo < -EPS ? 'bg-copper-50 border-copper-100 text-copper-700'
                        : fila.pendienteDeCobro > EPS ? 'bg-amber-50 border-amber-100 text-amber-800'
                        : 'bg-gray-50 border-gray-100 text-gray-600'
                    }`}>
                      <span>Caja disponible: <strong className="tabular-nums">{fmt(caja)}</strong></span>
                      <span>Transferible ahora: <strong className="tabular-nums">{fmt(transferible)}</strong></span>
                      {fila.pendienteDeCobro > EPS && <span>Pendiente por falta de fondos: <strong className="tabular-nums">{fmt(fila.pendienteDeCobro)}</strong></span>}
                      {fila.saldo < -EPS && <span>Debe aportar <strong className="tabular-nums">{fmt(-fila.saldo)}</strong> para quedar al día</span>}
                    </div>
                  </section>
                );
              })()}

              {/* Formulario */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-copper-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-teal-700">
                      {tipoForm === 'APORTE' ? 'Registrar aporte · el propietario pone plata para cubrir gastos' : 'Registrar transferencia al propietario'}
                    </h3>
                    <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Monto ($)</label>
                      <input
                        type="number" step="0.01" min="0.01" required autoFocus
                        max={tipoForm === 'DEBITO' ? transferible.toFixed(2) : undefined}
                        value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                        className={inputCls}
                      />
                      {tipoForm === 'DEBITO' && <p className="text-xs text-gray-500 mt-1">Máximo transferible: {fmt(transferible)}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Descripción</label>
                      <input
                        type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                        placeholder={tipoForm === 'APORTE' ? 'Ej: aporte 04/11/26 para pago monotributo' : 'Ej: transferencia noviembre'}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-copper-400 hover:bg-copper-500 disabled:opacity-50">
                      {loading ? 'Guardando...' : tipoForm === 'APORTE' ? 'Confirmar aporte' : 'Confirmar transferencia'}
                    </button>
                  </div>
                </form>
              )}

              {/* Composición del saldo */}
              <section className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                <Composicion titulo="Cobros (su parte)" valor={fila.cobros} signo="+" icon={Wallet} />
                <Composicion titulo="Gastos (su parte)" valor={fila.gastos} signo="−" icon={Receipt} />
                <Composicion titulo="Aportes" valor={fila.aportes} signo="+" icon={PiggyBank} />
                <Composicion titulo="Transferido" valor={fila.retiros} signo="−" icon={Send} />
                <div className={`rounded-xl p-4 border-2 ${fila.saldo >= 0 ? 'border-teal-200 bg-teal-50/50' : 'border-copper-200 bg-copper-50/50'} col-span-2 lg:col-span-1`}>
                  <p className="text-xs font-semibold text-gray-600">= Saldo</p>
                  <p className={`text-xl font-bold tabular-nums mt-1 ${fila.saldo >= 0 ? 'text-teal-700' : 'text-copper-600'}`}>{fmt(fila.saldo)}</p>
                  {Math.abs(fila.ajustes) > EPS && <p className="text-xs text-gray-500 mt-1">Incluye ajustes {fmt(fila.ajustes)}</p>}
                </div>
              </section>

              {/* Último cobro por inmueble */}
              {detalle?.saldosPorInmueble?.length > 0 && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Último cobro de cada propiedad</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {detalle.saldosPorInmueble.map((item: any, idx: number) => (
                      <div key={idx} className="rounded-lg border border-gray-100 p-3">
                        <p className="text-sm font-medium text-teal-700 truncate" title={item.inmueble.direccion}>{item.inmueble.direccion}</p>
                        {item.periodo ? (
                          <>
                            <p className="text-lg font-bold text-teal-600 tabular-nums">{fmt(item.saldo)}</p>
                            <p className="text-xs text-gray-500">{item.periodo} · {fmt0(item.montoBruto)} × {item.porcentajePropietario}%</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 mt-1">Sin cobros registrados</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Movimientos */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-teal-700">Movimientos</h3>
                  <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                    {FILTROS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFiltroTipo(f.key)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          filtroTipo === f.key ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-teal-600'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {movFiltrados.length === 0 ? (
                  <p className="p-10 text-center text-gray-400 text-sm">{movimientos.length === 0 ? 'Cargando movimientos…' : 'No hay movimientos de este tipo'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-5 py-3 font-medium">Fecha</th>
                          <th className="px-3 py-3 font-medium">Tipo</th>
                          <th className="px-3 py-3 font-medium">Concepto</th>
                          <th className="px-3 py-3 font-medium text-right">Monto</th>
                          <th className="px-3 py-3 font-medium text-right">Saldo</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {movFiltrados.map(mov => {
                          const t = TIPOS[mov.tipoMovimiento] || { label: mov.tipoMovimiento, credito: false, cls: 'bg-gray-100 text-gray-600' };
                          const borrable = mov.tipoMovimiento === 'DEBITO' || mov.tipoMovimiento === 'APORTE';
                          return (
                            <tr key={mov.id} className="group hover:bg-gray-50/70">
                              <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap tabular-nums">{fmtFecha(mov.fecha)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${t.cls}`}>{t.label}</span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">
                                {mov.descripcion || mov.referencia || '—'}
                                {mov.inmueble?.direccion && !String(mov.descripcion || '').includes(mov.inmueble.direccion) && (
                                  <span className="block text-xs text-gray-400">{mov.inmueble.direccion}</span>
                                )}
                              </td>
                              <td className={`px-3 py-2.5 text-right font-medium tabular-nums whitespace-nowrap ${t.credito ? 'text-teal-600' : 'text-copper-600'}`}>
                                {t.credito ? '+' : '−'}{fmt(mov.monto)}
                              </td>
                              <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${mov.saldoNuevo >= 0 ? 'text-gray-700' : 'text-copper-600'}`}>{fmt(mov.saldoNuevo)}</td>
                              <td className="pr-3 text-right">
                                {borrable && (
                                  <button onClick={() => eliminarMovimiento(mov)} title="Eliminar" className="p-1.5 rounded-md text-gray-300 group-hover:text-gray-500 hover:!text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        )}
      </div>
    </main>
  );
}

function Kpi({ titulo, valor, icon: Icon, tono, nota }: { titulo: string; valor: number; icon: LucideIcon; tono: 'teal' | 'copper' | 'amber'; nota: string }) {
  const c = {
    teal: { bg: 'bg-teal-50', ic: 'text-teal-500', txt: 'text-teal-700' },
    copper: { bg: 'bg-copper-50', ic: 'text-copper-500', txt: 'text-copper-600' },
    amber: { bg: 'bg-amber-50', ic: 'text-amber-500', txt: 'text-amber-700' },
  }[tono];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{titulo}</p>
        <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center`}><Icon className={`h-5 w-5 ${c.ic}`} /></div>
      </div>
      <p className={`text-2xl font-bold mt-2 tabular-nums ${c.txt}`}>{fmt(valor)}</p>
      <p className="text-xs text-gray-500 mt-1">{nota}</p>
    </div>
  );
}

function Composicion({ titulo, valor, signo, icon: Icon }: { titulo: string; valor: number; signo: '+' | '−'; icon: LucideIcon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5" /> {titulo}
      </div>
      <p className={`text-xl font-bold tabular-nums mt-1 ${signo === '+' ? 'text-teal-600' : 'text-copper-600'}`}>
        {valor > 0 ? signo : ''}{fmt(valor)}
      </p>
    </div>
  );
}
