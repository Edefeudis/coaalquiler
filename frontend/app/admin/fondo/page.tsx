'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, PiggyBank, Percent, Receipt, Flag, Plus, X, Trash2, Layers, AlertTriangle, ExternalLink,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'UTC' });
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const TIPOS: Record<string, { label: string; cls: string }> = {
  SALDO_INICIAL: { label: 'Saldo inicial', cls: 'bg-gray-100 text-gray-700' },
  INTERES: { label: 'Interés', cls: 'bg-teal-50 text-teal-700' },
  RESERVA: { label: 'Reserva', cls: 'bg-aqua-100 text-teal-700' },
  AJUSTE_POSITIVO: { label: 'Ajuste +', cls: 'bg-gray-100 text-gray-700' },
  AJUSTE_NEGATIVO: { label: 'Ajuste −', cls: 'bg-gray-100 text-gray-700' },
  GASTO: { label: 'Gasto pagado', cls: 'bg-copper-50 text-copper-600' },
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-300 focus:border-copper-300 text-gray-900 bg-white';

export default function FondoPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ tipo: 'INTERES', monto: '', fecha: hoy(), descripcion: '' });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/admin');
      return;
    }
    fetchFondo();
  }, [router]);

  function headers(json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function fetchFondo() {
    try {
      const res = await fetch(`${API}/fondo`, { headers: headers() });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Error fetching fondo:', err);
    }
  }

  function abrirForm(tipo = 'INTERES') {
    setForm({ tipo, monto: '', fecha: hoy(), descripcion: '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`${API}/fondo/movimiento`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ ...form, monto: parseFloat(form.monto), fecha: `${form.fecha}T12:00:00.000Z` }),
      });
      if (res.ok) {
        setShowForm(false);
        fetchFondo();
      } else {
        let msg = 'Error al registrar el movimiento';
        try { const err = await res.json(); if (err?.message) msg = err.message; } catch {}
        alert(msg);
      }
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(h: any) {
    if (!confirm(`¿Eliminar ${TIPOS[h.tipo]?.label.toLowerCase()} de ${fmt(h.monto)} del ${fmtFecha(h.fecha)}?`)) return;
    const res = await fetch(`${API}/fondo/movimiento/${h.movimientoId}`, { method: 'DELETE', headers: headers() });
    if (res.ok) fetchFondo();
    else alert('Error al eliminar el movimiento');
  }

  const sinInicial = data && data.inicial === 0;

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin/dashboard" className="flex items-center gap-1 text-[#B8E6E6] hover:text-white transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB]">Fondo de reserva</h1>
            </div>
            <button
              onClick={() => (showForm ? setShowForm(false) : abrirForm())}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                showForm ? 'bg-white/15 hover:bg-white/25' : 'bg-copper-400 hover:bg-copper-500'
              }`}
            >
              {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Registrar interés</>}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <p className="text-sm text-gray-500 max-w-3xl">
          Plata común que los propietarios separan e invierten para cubrir gastos. Los intereses quedan en el fondo.
          Los gastos marcados como <strong>pagados con el fondo</strong> salen de acá y no descuentan de la caja ni de las cuentas corrientes.
        </p>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-copper-200 p-6">
            <h2 className="font-bold text-teal-700 mb-4">Registrar movimiento del fondo</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                  <option value="INTERES">Interés / rendimiento</option>
                  <option value="AJUSTE_POSITIVO">Ajuste + (ingreso al fondo)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste − (salida del fondo)</option>
                  <option value="SALDO_INICIAL">Saldo inicial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Monto ($)</label>
                <input type="number" step="0.01" min="0.01" required autoFocus value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fecha</label>
                <input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Descripción</label>
                <input
                  type="text" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder={form.tipo === 'INTERES' ? 'Ej: interés plazo fijo octubre' : ''} className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button type="submit" disabled={guardando} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-copper-400 hover:bg-copper-500 disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        {!data ? (
          <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        ) : (
          <>
            {sinInicial && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Todavía no se cargó el saldo inicial del fondo.</span>
                <button onClick={() => abrirForm('SALDO_INICIAL')} className="font-medium underline">Cargar saldo inicial</button>
              </div>
            )}

            <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="col-span-2 lg:col-span-1 rounded-xl p-5 shadow-md border bg-gradient-to-br from-teal-600 to-teal-500 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-teal-50">Saldo del fondo</p>
                  <PiggyBank className="h-5 w-5 text-teal-100" />
                </div>
                <p className="text-3xl font-bold mt-2 tabular-nums">{fmt(data.saldo)}</p>
                <p className="text-xs text-teal-100 mt-1">Disponible para pagar gastos</p>
              </div>
              <Kpi titulo="Saldo inicial + reservas" valor={data.inicial + (data.reservas || 0)} icon={Flag} cls="text-gray-700" />
              <Kpi titulo="Intereses acumulados" valor={data.intereses} icon={Percent} cls="text-teal-700" signo="+" />
              <Kpi titulo="Gastos pagados con el fondo" valor={data.gastosPagados} icon={Receipt} cls="text-copper-600" signo="−" />
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-teal-700">Movimientos del fondo</h2>
                <a href="/admin/gastos" className="text-xs font-medium text-copper-500 hover:text-copper-600 flex items-center gap-1">
                  Cargar un gasto pagado con el fondo <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {data.historial.length === 0 ? (
                <p className="p-10 text-center text-sm text-gray-400">Sin movimientos todavía</p>
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
                      {data.historial.map((h: any) => (
                        <tr key={h.id} className="group hover:bg-gray-50/70">
                          <td className="px-5 py-2.5 text-gray-600 tabular-nums whitespace-nowrap">{fmtFecha(h.fecha)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${TIPOS[h.tipo]?.cls}`}>{TIPOS[h.tipo]?.label || h.tipo}</span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">
                            {h.descripcion || '—'}
                            {h.propietario && <span className="block text-xs text-gray-400">De la cuenta de {h.propietario} · se elimina desde Cuenta Corriente</span>}
                            {h.inmuebles && (
                              <span className="block text-xs text-gray-400">
                                {h.inmuebles.length > 1 ? <><Layers className="inline h-3 w-3 -mt-0.5" /> {h.inmuebles.length} inmuebles</> : h.inmuebles[0]}
                              </span>
                            )}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-medium tabular-nums whitespace-nowrap ${h.entrada ? 'text-teal-600' : 'text-copper-600'}`}>
                            {h.entrada ? '+' : '−'}{fmt(h.monto)}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${h.saldo >= 0 ? 'text-gray-700' : 'text-copper-600'}`}>{fmt(h.saldo)}</td>
                          <td className="pr-3 text-right">
                            {h.movimientoId && (
                              <button onClick={() => eliminar(h)} title="Eliminar" className="p-1.5 rounded-md text-gray-300 group-hover:text-gray-500 hover:!text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Kpi({ titulo, valor, icon: Icon, cls, signo }: { titulo: string; valor: number; icon: any; cls: string; signo?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{titulo}</p>
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className={`text-2xl font-bold mt-2 tabular-nums ${cls}`}>{valor > 0 && signo ? signo : ''}{fmt(valor)}</p>
    </div>
  );
}
