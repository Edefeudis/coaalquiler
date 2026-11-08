'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, ChevronLeft, ChevronRight, ChevronDown, Wallet, Receipt, Scale,
  CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, FileDown, AlertTriangle, Building2,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

type Inmueble = { id: number; direccion: string; propietarios?: any[] };
type Cobro = { id: number; inmuebleId: number; periodo: string; montoBruto: any; fechaCobro: string; inmueble?: Inmueble };
type Gasto = { id: number; inmuebleId: number; concepto: string; monto: any; fecha: string; descripcion?: string };

const num = (v: any) => (typeof v === 'number' ? v : parseFloat(v ?? 0)) || 0;
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'UTC' });
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombrePeriodo = (p: string) => { const [y, m] = p.split('-'); return `${MESES[parseInt(m) - 1]} ${y}`; };
const moverPeriodo = (p: string, delta: number) => {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const periodoActual = () => hoy().slice(0, 7);
const sinNotaComun = (d?: string) => (d || '').replace(/\s*·?\s*Gasto común dividido entre \d+ inmuebles \(total [\d.]+\)/, '').trim();

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-300 focus:border-copper-300 text-gray-900 bg-white';
const labelCls = 'block text-sm font-medium text-gray-600 mb-1';

export default function AdminCobrosPage() {
  const router = useRouter();
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]); // todos los cobros (para historial y variación)
  const [gastosMes, setGastosMes] = useState<Gasto[]>([]);
  const [periodo, setPeriodo] = useState(periodoActual());
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ inmuebleId: '', periodo: periodoActual(), fechaCobro: hoy(), monto: '' });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/admin');
      return;
    }
    Promise.all([fetchInmuebles(), fetchCobros()]).finally(() => setCargando(false));
  }, [router]);

  useEffect(() => {
    if (localStorage.getItem('token')) fetchGastosMes(periodo);
  }, [periodo]);

  function headers(json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function fetchInmuebles() {
    try {
      const res = await fetch(`${API}/inmuebles`, { headers: headers() });
      if (res.ok) setInmuebles(await res.json());
    } catch (err) { console.error('Error fetching inmuebles:', err); }
  }

  async function fetchCobros() {
    try {
      const res = await fetch(`${API}/cobros`, { headers: headers() });
      if (res.ok) setCobros(await res.json());
    } catch (err) { console.error('Error fetching cobros:', err); }
  }

  async function fetchGastosMes(p: string) {
    try {
      const [y, m] = p.split('-').map(Number);
      const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const qs = new URLSearchParams({ desde: `${p}-01T00:00:00.000Z`, hasta: `${p}-${String(ultimo).padStart(2, '0')}T23:59:59.999Z` });
      const res = await fetch(`${API}/gastos?${qs}`, { headers: headers() });
      if (res.ok) setGastosMes(await res.json());
    } catch (err) { console.error('Error fetching gastos:', err); }
  }

  // Último cobro de un inmueble ANTERIOR a un período (para variación y sugerir el monto)
  function cobroAnterior(inmuebleId: number, antesDe: string) {
    const previos = cobros.filter(c => c.inmuebleId === inmuebleId && c.periodo < antesDe);
    if (previos.length === 0) return null;
    const ultimoPeriodo = previos.reduce((max, c) => (c.periodo > max ? c.periodo : max), '');
    const delPeriodo = previos.filter(c => c.periodo === ultimoPeriodo);
    return { periodo: ultimoPeriodo, monto: delPeriodo.reduce((s, c) => s + num(c.montoBruto), 0) };
  }

  // Una fila por inmueble con lo que pasó en el período
  const filas = useMemo(() => inmuebles.map(inm => {
    const cobrosP = cobros.filter(c => c.inmuebleId === inm.id && c.periodo === periodo);
    const gastosP = gastosMes.filter(g => g.inmuebleId === inm.id);
    const cobrado = cobrosP.reduce((s, c) => s + num(c.montoBruto), 0);
    const gastos = gastosP.reduce((s, g) => s + num(g.monto), 0);
    const anterior = cobroAnterior(inm.id, periodo);
    const variacion = cobrosP.length > 0 && anterior && anterior.monto > 0 ? ((cobrado - anterior.monto) / anterior.monto) * 100 : null;
    return { inmueble: inm, cobros: cobrosP, gastos: gastosP, cobrado, totalGastos: gastos, neto: cobrado - gastos, anterior, variacion };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [inmuebles, cobros, gastosMes, periodo]);

  const totales = useMemo(() => ({
    cobrado: filas.reduce((s, f) => s + f.cobrado, 0),
    gastos: filas.reduce((s, f) => s + f.totalGastos, 0),
    neto: filas.reduce((s, f) => s + f.neto, 0),
    cobrados: filas.filter(f => f.cobros.length > 0).length,
  }), [filas]);

  // Últimos 6 períodos para la mini-tendencia
  const tendencia = useMemo(() => {
    const out: { periodo: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const p = moverPeriodo(periodo, -i);
      out.push({ periodo: p, total: cobros.filter(c => c.periodo === p).reduce((s, c) => s + num(c.montoBruto), 0) });
    }
    return out;
  }, [cobros, periodo]);
  const maxTend = Math.max(1, ...tendencia.map(t => t.total));

  function abrirForm(inmuebleId?: number) {
    const sugerido = inmuebleId ? cobroAnterior(inmuebleId, periodo) : null;
    setForm({
      inmuebleId: inmuebleId ? String(inmuebleId) : '',
      periodo,
      fechaCobro: hoy(),
      monto: sugerido ? String(Math.round(sugerido.monto * 100) / 100) : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Datos de ayuda del formulario
  const formInmId = form.inmuebleId ? parseInt(form.inmuebleId) : null;
  const formAnterior = formInmId ? cobroAnterior(formInmId, form.periodo) : null;
  const formMonto = num(form.monto);
  const formVariacion = formAnterior && formAnterior.monto > 0 && formMonto > 0 ? ((formMonto - formAnterior.monto) / formAnterior.monto) * 100 : null;
  const formDuplicado = formInmId ? cobros.filter(c => c.inmuebleId === formInmId && c.periodo === form.periodo) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!(formMonto > 0)) return alert('El importe debe ser mayor a 0');
    if (formDuplicado.length > 0 && !confirm(`Ya hay ${formDuplicado.length === 1 ? 'un cobro' : `${formDuplicado.length} cobros`} de este inmueble para ${nombrePeriodo(form.periodo)}. ¿Registrar otro igual?`)) return;
    setGuardando(true);
    try {
      const res = await fetch(`${API}/cobros`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({
          inmuebleId: formInmId,
          periodo: form.periodo,
          montoBruto: formMonto,
          fechaCobro: form.fechaCobro ? `${form.fechaCobro}T12:00:00.000Z` : undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setPeriodo(form.periodo);
        await fetchCobros();
      } else {
        let msg = 'Error al registrar el cobro';
        try { const err = await res.json(); if (err?.message) msg = err.message; } catch {}
        alert(msg);
      }
    } catch (err) {
      console.error('Error creating cobro:', err);
      alert('Error al registrar el cobro');
    } finally {
      setGuardando(false);
    }
  }

  function toggle(id: number) {
    const s = new Set(expandidos);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandidos(s);
  }

  async function exportarPDF() {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const money = (n: number) => fmt(n).replace(/ /g, ' ');
      doc.setFontSize(18);
      doc.text('Cobros y gastos del período', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(nombrePeriodo(periodo).replace(/^./, c => c.toUpperCase()), 105, 28, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, 105, 34, { align: 'center' });

      let y = 48;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Inmueble', 14, y); doc.text('Estado', 92, y);
      doc.text('Cobrado', 140, y, { align: 'right' }); doc.text('Gastos', 168, y, { align: 'right' }); doc.text('Neto', 196, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.line(14, y + 2, 196, y + 2);
      y += 9;
      for (const f of filas) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(f.inmueble.direccion.slice(0, 40), 14, y);
        doc.text(f.cobros.length ? 'Cobrado' : 'Pendiente', 92, y);
        doc.text(money(f.cobrado), 140, y, { align: 'right' });
        doc.text(money(f.totalGastos), 168, y, { align: 'right' });
        doc.text(money(f.neto), 196, y, { align: 'right' });
        y += 7;
      }
      doc.line(14, y - 4, 196, y - 4);
      doc.setFont('helvetica', 'bold');
      doc.text('Total', 14, y + 1);
      doc.text(money(totales.cobrado), 140, y + 1, { align: 'right' });
      doc.text(money(totales.gastos), 168, y + 1, { align: 'right' });
      doc.text(money(totales.neto), 196, y + 1, { align: 'right' });
      doc.save(`Cobros_${periodo}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar el PDF');
    }
  }

  const pendientes = filas.length - totales.cobrados;

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin/dashboard" className="flex items-center gap-1 text-[#B8E6E6] hover:text-white transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB]">Cobros</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportarPDF} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white bg-white/10 hover:bg-white/20">
                <FileDown className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => (showForm ? setShowForm(false) : abrirForm())}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  showForm ? 'bg-white/15 hover:bg-white/25' : 'bg-copper-400 hover:bg-copper-500'
                }`}
              >
                {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Nuevo cobro</>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Formulario */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-copper-200 p-6">
            <h2 className="text-lg font-bold text-teal-700 mb-5">Registrar cobro de alquiler</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Inmueble</label>
                <select
                  value={form.inmuebleId} required className={inputCls}
                  onChange={e => {
                    const id = e.target.value;
                    const sug = id ? cobroAnterior(parseInt(id), form.periodo) : null;
                    setForm({ ...form, inmuebleId: id, monto: form.monto || (sug ? String(Math.round(sug.monto * 100) / 100) : '') });
                  }}
                >
                  <option value="">Seleccionar inmueble</option>
                  {inmuebles.map(i => <option key={i.id} value={i.id}>{i.direccion}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Período</label>
                <input type="month" required value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha de cobro</label>
                <input type="date" required value={form.fechaCobro} onChange={e => setForm({ ...form, fechaCobro: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Importe cobrado ($)</label>
                <input
                  type="number" step="0.01" min="0.01" required value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  className={`${inputCls} text-lg font-semibold`}
                />
              </div>
              <div className="md:col-span-2 flex flex-col justify-end gap-1.5 text-sm">
                {formAnterior ? (
                  <p className="text-gray-600">
                    Cobro anterior ({nombrePeriodo(formAnterior.periodo)}): <strong className="tabular-nums">{fmt(formAnterior.monto)}</strong>
                    {formVariacion !== null && (
                      <span className={`ml-2 inline-flex items-center gap-0.5 font-semibold ${formVariacion > 0 ? 'text-teal-600' : formVariacion < 0 ? 'text-copper-600' : 'text-gray-500'}`}>
                        {formVariacion > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : formVariacion < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {formVariacion > 0 ? '+' : ''}{formVariacion.toFixed(1)}%
                      </span>
                    )}
                  </p>
                ) : formInmId ? (
                  <p className="text-gray-400">Sin cobros anteriores para este inmueble</p>
                ) : null}
                {formDuplicado.length > 0 && (
                  <p className="flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Ya hay {fmt(formDuplicado.reduce((s, c) => s + num(c.montoBruto), 0))} cobrado de este inmueble para {nombrePeriodo(form.periodo)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-gray-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
              <button type="submit" disabled={guardando} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-copper-400 hover:bg-copper-500 disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Registrar cobro'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">Al registrarlo se distribuye automáticamente entre los propietarios según su porcentaje.</p>
          </form>
        )}

        {/* Selector de período + tendencia */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setPeriodo(moverPeriodo(periodo, -1))} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-teal-600" title="Mes anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center min-w-[11rem]">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Período</p>
              <p className="text-lg font-bold text-teal-700 capitalize">{nombrePeriodo(periodo)}</p>
            </div>
            <button onClick={() => setPeriodo(moverPeriodo(periodo, 1))} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-teal-600" title="Mes siguiente">
              <ChevronRight className="h-5 w-5" />
            </button>
            <input type="month" value={periodo} onChange={e => e.target.value && setPeriodo(e.target.value)} className="ml-2 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600" />
            {periodo !== periodoActual() && (
              <button onClick={() => setPeriodo(periodoActual())} className="text-xs font-medium text-copper-500 hover:text-copper-600 ml-1">Hoy</button>
            )}
          </div>
          {/* Mini gráfico de los últimos 6 meses */}
          <div className="flex items-end gap-1.5 h-12" title="Cobrado en los últimos 6 meses">
            {tendencia.map(t => (
              <button key={t.periodo} onClick={() => setPeriodo(t.periodo)} className="group flex flex-col items-center gap-1" title={`${nombrePeriodo(t.periodo)}: ${fmt(t.total)}`}>
                <div
                  className={`w-7 rounded-t ${t.periodo === periodo ? 'bg-copper-400' : 'bg-teal-200 group-hover:bg-teal-300'}`}
                  style={{ height: `${Math.max(3, (t.total / maxTend) * 32)}px` }}
                />
                <span className={`text-[10px] ${t.periodo === periodo ? 'text-copper-600 font-semibold' : 'text-gray-400'}`}>{MESES[parseInt(t.periodo.slice(5)) - 1].slice(0, 3)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Cobrado" valor={fmt(totales.cobrado)} icon={Wallet} cls="text-teal-700" bg="bg-teal-50" ic="text-teal-500" />
          <Kpi titulo="Gastos del mes" valor={fmt(totales.gastos)} icon={Receipt} cls="text-copper-600" bg="bg-copper-50" ic="text-copper-500" />
          <Kpi titulo="Neto" valor={fmt(totales.neto)} icon={Scale} cls={totales.neto >= 0 ? 'text-teal-700' : 'text-copper-600'} bg="bg-gray-50" ic="text-gray-500" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Inmuebles cobrados</p>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${pendientes ? 'bg-amber-50' : 'bg-teal-50'}`}>
                {pendientes ? <Clock className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-teal-500" />}
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 text-teal-700 tabular-nums">{totales.cobrados} <span className="text-base text-gray-400 font-medium">de {filas.length}</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${filas.length ? (totales.cobrados / filas.length) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        {/* Tabla por inmueble */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <div className="p-6 space-y-3">{[0, 1, 2, 3].map(i => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="w-8"></th>
                    <th className="px-3 py-3 font-medium">Inmueble</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium text-right">Cobrado</th>
                    <th className="px-3 py-3 font-medium text-right">vs. anterior</th>
                    <th className="px-3 py-3 font-medium text-right">Gastos</th>
                    <th className="px-3 py-3 font-medium text-right">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map(f => {
                    const abierto = expandidos.has(f.inmueble.id);
                    const cobrado = f.cobros.length > 0;
                    return (
                      <Frag key={f.inmueble.id}>
                        <tr onClick={() => toggle(f.inmueble.id)} className={`group cursor-pointer hover:bg-gray-50/70 ${abierto ? 'bg-gray-50/70' : ''}`}>
                          <td className="pl-3 text-gray-400 group-hover:text-teal-600">
                            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-teal-300 shrink-0" />
                              <span className="font-medium text-teal-700">{f.inmueble.direccion}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {cobrado ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" /> Cobrado {fmtFecha(f.cobros[0].fechaCobro)}{f.cobros.length > 1 ? ` (${f.cobros.length} pagos)` : ''}
                              </span>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); abrirForm(f.inmueble.id); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 whitespace-nowrap"
                                title="Registrar el cobro de este período"
                              >
                                <Clock className="h-3 w-3" /> Pendiente · cargar
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap text-gray-900">{cobrado ? fmt(f.cobrado) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                            {f.variacion === null ? <span className="text-gray-300">—</span> : (
                              <span className={`inline-flex items-center gap-0.5 font-medium ${f.variacion > 0.05 ? 'text-teal-600' : f.variacion < -0.05 ? 'text-copper-600' : 'text-gray-500'}`}>
                                {f.variacion > 0.05 ? <TrendingUp className="h-3.5 w-3.5" /> : f.variacion < -0.05 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                {f.variacion > 0 ? '+' : ''}{f.variacion.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-copper-600">{f.totalGastos > 0 ? `−${fmt(f.totalGastos)}` : <span className="text-gray-300">—</span>}</td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${f.neto >= 0 ? 'text-teal-700' : 'text-copper-600'}`}>{fmt(f.neto)}</td>
                        </tr>

                        {abierto && (
                          <tr className="bg-gray-50/70">
                            <td colSpan={7} className="px-6 pb-5 pt-1">
                              <div className="grid gap-4 lg:grid-cols-3">
                                {/* Cobros */}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">Cobros del período</p>
                                  {f.cobros.length === 0 ? (
                                    <div className="rounded-lg bg-white border border-dashed border-gray-200 p-3 text-sm text-gray-400">
                                      Sin cobro registrado.
                                      {f.anterior && <> El anterior ({nombrePeriodo(f.anterior.periodo)}) fue de {fmt(f.anterior.monto)}.</>}
                                    </div>
                                  ) : (
                                    <div className="rounded-lg bg-white border border-gray-100 divide-y divide-gray-100">
                                      {f.cobros.map(c => (
                                        <div key={c.id} className="flex justify-between px-3 py-2 text-sm">
                                          <span className="text-gray-600">{fmtFecha(c.fechaCobro)}</span>
                                          <span className="font-medium tabular-nums">{fmt(num(c.montoBruto))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Reparto */}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">Le corresponde a cada propietario</p>
                                  <div className="rounded-lg bg-white border border-gray-100 divide-y divide-gray-100">
                                    {(f.inmueble.propietarios || []).map((rel: any) => {
                                      const pct = num(rel.porcentaje) / 100;
                                      return (
                                        <div key={rel.propietarioId} className="flex justify-between gap-2 px-3 py-2 text-sm">
                                          <span className="text-gray-600 truncate">{rel.propietario?.nombre} <span className="text-gray-400">· {num(rel.porcentaje)}%</span></span>
                                          <span className="tabular-nums text-right">
                                            <span className="font-medium text-teal-700">{fmt(f.cobrado * pct)}</span>
                                            {f.totalGastos > 0 && <span className="block text-xs text-gray-400">neto {fmt(f.neto * pct)}</span>}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                {/* Gastos */}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">Gastos del mes</p>
                                  {f.gastos.length === 0 ? (
                                    <div className="rounded-lg bg-white border border-dashed border-gray-200 p-3 text-sm text-gray-400">Sin gastos en el mes.</div>
                                  ) : (
                                    <div className="rounded-lg bg-white border border-gray-100 divide-y divide-gray-100">
                                      {f.gastos.map(g => (
                                        <div key={g.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
                                          <span className="text-gray-600 truncate" title={sinNotaComun(g.descripcion) || g.concepto}>
                                            {g.concepto} <span className="text-gray-400">· {fmtFecha(g.fecha)}</span>
                                          </span>
                                          <span className="font-medium tabular-nums text-copper-600">{fmt(num(g.monto))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Frag>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-gray-700">
                    <td></td>
                    <td className="px-3 py-3" colSpan={2}>Total</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(totales.cobrado)}</td>
                    <td></td>
                    <td className="px-3 py-3 text-right tabular-nums text-copper-600">−{fmt(totales.gastos)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${totales.neto >= 0 ? 'text-teal-700' : 'text-copper-600'}`}>{fmt(totales.neto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Frag({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Kpi({ titulo, valor, icon: Icon, cls, bg, ic }: { titulo: string; valor: string; icon: any; cls: string; bg: string; ic: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{titulo}</p>
        <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`h-5 w-5 ${ic}`} /></div>
      </div>
      <p className={`text-2xl font-bold mt-2 tabular-nums ${cls}`}>{valor}</p>
    </div>
  );
}
