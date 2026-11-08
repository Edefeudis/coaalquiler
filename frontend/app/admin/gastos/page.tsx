'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Pencil, Trash2, ChevronDown, ChevronRight, Building2,
  CalendarDays, Receipt, Users, Check, Layers,
} from 'lucide-react';

const API = 'http://localhost:3000/api';

type Inmueble = { id: number; direccion: string; propietarios?: any[] };
type Gasto = {
  id: number; inmuebleId: number; concepto: string; monto: any; descripcion?: string; fecha: string;
  grupoId?: string | null;
  pagadoCon?: 'CAJA' | 'FONDO';
  inmueble?: Inmueble;
};
type PagadoCon = 'CAJA' | 'FONDO';
// Una fila del listado: un gasto suelto o un gasto común (varias partes con el mismo grupoId)
type Fila = { key: string; grupoId: string | null; gasto: Gasto; partes: Gasto[]; total: number };

// Nota que agrega el sistema al dividir un gasto común; en la fila agrupada no hace falta mostrarla
const NOTA_COMUN = /\s*·?\s*Gasto común dividido entre \d+ inmuebles \(total [\d.]+\)/;
const sinNota = (d?: string) => (d || '').replace(NOTA_COMUN, '').trim();

const num = (v: any) => (typeof v === 'number' ? v : parseFloat(v ?? 0)) || 0;
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
// Las fechas se guardan como medianoche UTC: mostrarlas en UTC evita que aparezcan un día antes
const fmtFecha = (f: string) => new Date(f).toLocaleDateString('es-AR', { timeZone: 'UTC' });
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-300 focus:border-copper-300 text-gray-900 bg-white';
const labelCls = 'block text-sm font-medium text-gray-600 mb-1';

const formVacio = { concepto: '', monto: '', descripcion: '', fecha: hoyISO(), pagadoCon: 'CAJA' as PagadoCon };

/** Selector Caja / Fondo de reserva */
function SelectorPagadoCon({ value, onChange, saldoFondo }: { value: PagadoCon; onChange: (v: PagadoCon) => void; saldoFondo: number | null }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
      {([['CAJA', 'Caja'], ['FONDO', 'Fondo de reserva']] as const).map(([v, t]) => (
        <button
          key={v} type="button" onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${value === v ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-teal-600'}`}
        >
          {t}{v === 'FONDO' && saldoFondo !== null && <span className="ml-1 text-xs text-gray-400">({fmt(saldoFondo)})</span>}
        </button>
      ))}
    </div>
  );
}

export default function AdminGastosPage() {
  const router = useRouter();
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Filtros
  const [filtroInmueble, setFiltroInmueble] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>(''); // YYYY-MM

  // Formulario de alta
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [alcance, setAlcance] = useState<'uno' | 'varios'>('uno');
  const [inmuebleForm, setInmuebleForm] = useState<string>('');
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [modo, setModo] = useState<'DIVIDIR' | 'REPETIR'>('DIVIDIR');

  // Edición / detalle
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ concepto: '', monto: '', descripcion: '', fecha: '', pagadoCon: 'CAJA' as PagadoCon });
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [saldoFondo, setSaldoFondo] = useState<number | null>(null);

  async function fetchSaldoFondo() {
    try {
      const res = await fetch(`${API}/fondo/saldo`, { headers: headers() });
      if (res.ok) setSaldoFondo((await res.json()).saldo);
    } catch {}
  }

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/admin');
      return;
    }
    fetchInmuebles();
  }, [router]);

  useEffect(() => {
    if (localStorage.getItem('token')) fetchGastos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroInmueble, filtroMes]);

  function headers(json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function fetchInmuebles() {
    try {
      const res = await fetch(`${API}/inmuebles`, { headers: headers() });
      if (res.ok) setInmuebles(await res.json());
    } catch (err) {
      console.error('Error fetching inmuebles:', err);
    }
  }

  async function fetchGastos() {
    setCargando(true);
    fetchSaldoFondo();
    try {
      const params = new URLSearchParams();
      if (filtroMes) {
        const [y, m] = filtroMes.split('-').map(Number);
        const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
        params.set('desde', `${filtroMes}-01T00:00:00.000Z`);
        params.set('hasta', `${filtroMes}-${String(ultimo).padStart(2, '0')}T23:59:59.999Z`);
      }
      const base = filtroInmueble === 'todos' ? `${API}/gastos` : `${API}/gastos/inmueble/${filtroInmueble}`;
      const res = await fetch(`${base}${params.toString() ? `?${params}` : ''}`, { headers: headers() });
      if (res.ok) setGastos(await res.json());
      else console.error('Error fetching gastos:', await res.text());
    } catch (err) {
      console.error('Error fetching gastos:', err);
    } finally {
      setCargando(false);
    }
  }

  function inmuebleDe(g: Gasto): Inmueble | undefined {
    return g.inmueble || inmuebles.find(i => i.id === g.inmuebleId);
  }

  function distribucion(g: Gasto) {
    const inm = inmuebleDe(g);
    return (inm?.propietarios || []).map((rel: any) => ({
      propietarioId: rel.propietarioId,
      nombre: rel.propietario?.nombre ?? `#${rel.propietarioId}`,
      porcentaje: num(rel.porcentaje),
      monto: (num(g.monto) * num(rel.porcentaje)) / 100,
    }));
  }

  // Con "Todas las propiedades" los gastos comunes se muestran como una sola fila con el total
  const agrupar = filtroInmueble === 'todos';
  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = [];
    const porGrupo = new Map<string, Fila>();
    for (const g of gastos) {
      if (agrupar && g.grupoId) {
        const f = porGrupo.get(g.grupoId);
        if (f) { f.partes.push(g); f.total += num(g.monto); continue; }
        const nueva: Fila = { key: `grp-${g.grupoId}`, grupoId: g.grupoId, gasto: g, partes: [g], total: num(g.monto) };
        porGrupo.set(g.grupoId, nueva);
        out.push(nueva);
      } else {
        out.push({ key: `g-${g.id}`, grupoId: null, gasto: g, partes: [g], total: num(g.monto) });
      }
    }
    for (const f of porGrupo.values()) {
      f.partes.sort((a, b) => (inmuebleDe(a)?.direccion || '').localeCompare(inmuebleDe(b)?.direccion || ''));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, agrupar, inmuebles]);

  function distribucionFila(f: Fila) {
    const acc = new Map<number, { propietarioId: number; nombre: string; monto: number; porcentaje: number }>();
    for (const g of f.partes) {
      for (const d of distribucion(g)) {
        const prev = acc.get(d.propietarioId) || { ...d, monto: 0 };
        prev.monto += d.monto;
        acc.set(d.propietarioId, prev);
      }
    }
    return [...acc.values()];
  }

  // Totales del listado actual
  const resumen = useMemo(() => {
    const total = gastos.reduce((s, g) => s + num(g.monto), 0);
    const porProp = new Map<number, { nombre: string; monto: number }>();
    for (const g of gastos) {
      if (g.pagadoCon === 'FONDO') continue; // lo paga el fondo común, no se le descuenta a nadie
      for (const d of distribucion(g)) {
        const prev = porProp.get(d.propietarioId) || { nombre: d.nombre, monto: 0 };
        prev.monto += d.monto;
        porProp.set(d.propietarioId, prev);
      }
    }
    return { total, porPropietario: [...porProp.values()].sort((a, b) => b.monto - a.monto) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, inmuebles]);

  function abrirForm() {
    setForm({ ...formVacio, fecha: hoyISO() });
    setAlcance('uno');
    setInmuebleForm(filtroInmueble !== 'todos' ? filtroInmueble : '');
    setSeleccion(new Set(inmuebles.map(i => i.id)));
    setModo('DIVIDIR');
    setShowForm(true);
  }

  const montoForm = num(form.monto);
  const cantSel = seleccion.size;
  const montoPorInmueble = alcance === 'varios' && cantSel > 0
    ? (modo === 'DIVIDIR' ? montoForm / cantSel : montoForm)
    : montoForm;
  const totalACargar = alcance === 'varios' ? (modo === 'DIVIDIR' ? montoForm : montoForm * cantSel) : montoForm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (alcance === 'uno' && !inmuebleForm) return alert('Seleccioná un inmueble');
    if (alcance === 'varios' && cantSel === 0) return alert('Seleccioná al menos un inmueble');
    if (!(montoForm > 0)) return alert('El monto debe ser mayor a 0');

    setGuardando(true);
    try {
      const comunes = {
        concepto: form.concepto.trim(),
        monto: montoForm,
        descripcion: form.descripcion.trim() || undefined,
        fecha: form.fecha || undefined,
        pagadoCon: form.pagadoCon,
      };
      const res = alcance === 'uno'
        ? await fetch(`${API}/gastos`, {
            method: 'POST', headers: headers(true),
            body: JSON.stringify({ ...comunes, inmuebleId: parseInt(inmuebleForm) }),
          })
        : await fetch(`${API}/gastos/multiple`, {
            method: 'POST', headers: headers(true),
            body: JSON.stringify({ ...comunes, inmuebleIds: [...seleccion], modo }),
          });

      if (res.ok) {
        setShowForm(false);
        fetchGastos();
      } else {
        let msg = 'Error al crear el gasto';
        try { const err = await res.json(); if (err?.message) msg = Array.isArray(err.message) ? err.message.join(', ') : err.message; } catch {}
        alert(msg);
      }
    } catch (err) {
      console.error('Error creating gasto:', err);
      alert('Error al crear el gasto');
    } finally {
      setGuardando(false);
    }
  }

  async function handleUpdate(f: Fila) {
    try {
      const res = f.grupoId
        ? await fetch(`${API}/gastos/grupo/${f.grupoId}`, {
            method: 'PUT', headers: headers(true),
            body: JSON.stringify({
              concepto: editForm.concepto,
              montoTotal: num(editForm.monto),
              descripcion: editForm.descripcion,
              fecha: editForm.fecha,
              pagadoCon: editForm.pagadoCon,
            }),
          })
        : await fetch(`${API}/gastos/${f.gasto.id}`, {
            method: 'PUT', headers: headers(true),
            body: JSON.stringify({
              concepto: editForm.concepto,
              monto: num(editForm.monto),
              descripcion: editForm.descripcion,
              fecha: editForm.fecha,
              pagadoCon: editForm.pagadoCon,
            }),
          });
      if (res.ok) {
        setEditingId(null);
        fetchGastos();
      } else {
        alert('Error al actualizar el gasto');
      }
    } catch (err) {
      console.error('Error updating gasto:', err);
      alert('Error al actualizar el gasto');
    }
  }

  async function handleDelete(f: Fila) {
    const g = f.gasto;
    const pregunta = f.grupoId
      ? `¿Eliminar el gasto común "${g.concepto}" de ${fmt(f.total)}?\nSe borran sus ${f.partes.length} partes, una en cada inmueble.`
      : `¿Eliminar el gasto "${g.concepto}" de ${fmt(num(g.monto))}?`;
    if (!confirm(pregunta)) return;
    try {
      const url = f.grupoId ? `${API}/gastos/grupo/${f.grupoId}` : `${API}/gastos/${g.id}`;
      const res = await fetch(url, { method: 'DELETE', headers: headers() });
      if (res.ok) fetchGastos();
      else alert('Error al eliminar el gasto');
    } catch (err) {
      console.error('Error deleting gasto:', err);
      alert('Error al eliminar el gasto');
    }
  }

  function toggleExpandido(id: string) {
    const s = new Set(expandidos);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandidos(s);
  }

  function toggleSeleccion(id: number) {
    const s = new Set(seleccion);
    s.has(id) ? s.delete(id) : s.add(id);
    setSeleccion(s);
  }

  const mostrarColInmueble = filtroInmueble === 'todos';
  const nombreFiltro = filtroInmueble === 'todos'
    ? 'Todas las propiedades'
    : inmuebles.find(i => String(i.id) === filtroInmueble)?.direccion || '';
  const nombreMes = filtroMes
    ? new Date(`${filtroMes}-15T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : 'Todos los meses';

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin/dashboard" className="flex items-center gap-1 text-[#B8E6E6] hover:text-white transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB]">Gastos</h1>
            </div>
            <button
              onClick={() => (showForm ? setShowForm(false) : abrirForm())}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                showForm ? 'bg-white/15 hover:bg-white/25' : 'bg-copper-400 hover:bg-copper-500'
              }`}
            >
              {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Nuevo gasto</>}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Formulario de alta */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-copper-200 p-6">
            <h2 className="text-lg font-bold text-teal-700 mb-5">Nuevo gasto</h2>

            {/* Alcance */}
            <div className="mb-5">
              <p className={labelCls}>¿A qué propiedades corresponde?</p>
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                {([
                  ['uno', 'Un inmueble', Building2],
                  ['varios', 'Varios / todos', Layers],
                ] as const).map(([valor, texto, Icon]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setAlcance(valor)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      alcance === valor ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-teal-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {texto}
                  </button>
                ))}
              </div>
            </div>

            {alcance === 'uno' ? (
              <div className="mb-5">
                <label className={labelCls}>Inmueble</label>
                <select value={inmuebleForm} onChange={e => setInmuebleForm(e.target.value)} required className={inputCls}>
                  <option value="">Seleccionar inmueble</option>
                  {inmuebles.map(i => <option key={i.id} value={i.id}>{i.direccion}</option>)}
                </select>
              </div>
            ) : (
              <div className="mb-5 rounded-lg border border-gray-200 p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-600">
                    Inmuebles <span className="text-gray-400">({cantSel} de {inmuebles.length})</span>
                  </p>
                  <div className="flex gap-3 text-xs font-medium">
                    <button type="button" onClick={() => setSeleccion(new Set(inmuebles.map(i => i.id)))} className="text-copper-500 hover:text-copper-600">
                      Todos
                    </button>
                    <button type="button" onClick={() => setSeleccion(new Set())} className="text-gray-500 hover:text-gray-700">
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {inmuebles.map(i => {
                    const sel = seleccion.has(i.id);
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => toggleSeleccion(i.id)}
                        className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          sel ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${sel ? 'bg-teal-500 border-teal-500' : 'border-gray-300'}`}>
                          {sel && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className="truncate">{i.direccion}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">¿Cómo se reparte el monto?</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ['DIVIDIR', 'Dividir el total en partes iguales', 'Ej: monotributo, contador, banco'],
                      ['REPETIR', 'El mismo monto en cada inmueble', 'Ej: un servicio que cuesta lo mismo en cada uno'],
                    ] as const).map(([valor, titulo, ayuda]) => (
                      <label
                        key={valor}
                        className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          modo === valor ? 'border-copper-300 bg-copper-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="modo" checked={modo === valor} onChange={() => setModo(valor)} className="mt-1 accent-copper-500" />
                        <span>
                          <span className="block text-sm font-medium text-gray-800">{titulo}</span>
                          <span className="block text-xs text-gray-500">{ayuda}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className={labelCls}>Concepto</label>
                <input
                  type="text" required value={form.concepto}
                  onChange={e => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej: Monotributo octubre" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {alcance === 'varios' && modo === 'DIVIDIR' ? 'Monto total ($)' : 'Monto ($)'}
                </label>
                <input
                  type="number" step="0.01" min="0.01" required value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  type="text" value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pagado con</label>
                <SelectorPagadoCon value={form.pagadoCon} onChange={v => setForm({ ...form, pagadoCon: v })} saldoFondo={saldoFondo} />
              </div>
            </div>
            {form.pagadoCon === 'FONDO' && (
              <p className={`mt-3 text-sm ${saldoFondo !== null && totalACargar > saldoFondo + 0.005 ? 'text-amber-700' : 'text-gray-500'}`}>
                {saldoFondo !== null && totalACargar > saldoFondo + 0.005
                  ? `⚠ El fondo tiene ${fmt(saldoFondo)}: este gasto lo dejaría en negativo.`
                  : 'Sale del fondo de reserva común: no descuenta de la caja ni de las cuentas corrientes de los propietarios.'}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                {alcance === 'varios' && cantSel > 0 && montoForm > 0 ? (
                  <>
                    Se cargarán <strong>{cantSel}</strong> gastos de <strong>{fmt(montoPorInmueble)}</strong>
                    {' '}· Total <strong>{fmt(totalACargar)}</strong>
                  </>
                ) : alcance === 'uno' && montoForm > 0 ? (
                  <>Total <strong>{fmt(montoForm)}</strong></>
                ) : (
                  <span className="text-gray-400">Completá el monto para ver el resumen</span>
                )}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                  Cancelar
                </button>
                <button
                  type="submit" disabled={guardando}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-copper-400 hover:bg-copper-500 disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : alcance === 'varios' ? `Cargar en ${cantSel} inmuebles` : 'Guardar gasto'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[16rem]">
            <label className={labelCls}><Building2 className="inline h-4 w-4 mr-1 -mt-0.5 text-teal-400" />Propiedad</label>
            <select value={filtroInmueble} onChange={e => setFiltroInmueble(e.target.value)} className={inputCls}>
              <option value="todos">Todas las propiedades</option>
              {inmuebles.map(i => <option key={i.id} value={i.id}>{i.direccion}</option>)}
            </select>
          </div>
          <div className="w-52">
            <label className={labelCls}><CalendarDays className="inline h-4 w-4 mr-1 -mt-0.5 text-teal-400" />Mes</label>
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputCls} />
          </div>
          {filtroMes && (
            <button onClick={() => setFiltroMes('')} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Ver todos los meses
            </button>
          )}
        </div>

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total gastos</p>
              <Receipt className="h-5 w-5 text-copper-400" />
            </div>
            <p className="text-2xl font-bold text-teal-700 mt-2 tabular-nums">{fmt(resumen.total)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {filas.length} {filas.length === 1 ? 'gasto' : 'gastos'} · <span className="capitalize">{nombreMes}</span>
            </p>
            <p className="text-xs text-gray-400 truncate">{nombreFiltro}</p>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Le corresponde a cada propietario</p>
              <Users className="h-5 w-5 text-teal-400" />
            </div>
            {resumen.porPropietario.length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos para el período</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {resumen.porPropietario.map(p => (
                  <div key={p.nombre} className="rounded-lg bg-teal-50/60 px-3 py-2">
                    <p className="text-xs text-teal-600 truncate" title={p.nombre}>{p.nombre}</p>
                    <p className="text-base font-semibold text-teal-700 tabular-nums">{fmt(p.monto)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Listado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando && gastos.length === 0 ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
            </div>
          ) : gastos.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-10 w-10 mx-auto text-gray-300" />
              <p className="mt-3 font-medium text-gray-600">No hay gastos para este filtro</p>
              <button onClick={abrirForm} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-copper-400 hover:bg-copper-500">
                <Plus className="h-4 w-4" /> Cargar gasto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="w-8"></th>
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    {mostrarColInmueble && <th className="px-3 py-3 font-medium">Inmueble</th>}
                    <th className="px-3 py-3 font-medium">Concepto</th>
                    <th className="px-3 py-3 font-medium text-right">Monto</th>
                    <th className="px-3 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map(f => {
                    const g = f.gasto;
                    const esGrupo = !!f.grupoId;
                    const abierto = expandidos.has(f.key);
                    const editando = editingId === f.key;
                    const dist = distribucionFila(f);
                    const cols = mostrarColInmueble ? 6 : 5;
                    const desc = esGrupo ? sinNota(g.descripcion) : g.descripcion;
                    const todas = esGrupo && f.partes.length === inmuebles.length;
                    return (
                      <FragmentRow key={f.key}>
                        <tr
                          onClick={() => toggleExpandido(f.key)}
                          className={`group cursor-pointer hover:bg-gray-50/70 ${abierto || editando ? 'bg-gray-50/70' : ''}`}
                        >
                          <td className="pl-3">
                            <span className="p-1 inline-block text-gray-400 group-hover:text-teal-600" title="Ver distribución">
                              {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-600 whitespace-nowrap tabular-nums">{fmtFecha(g.fecha)}</td>
                          {mostrarColInmueble && (
                            <td className="px-3 py-3 text-gray-600 max-w-[14rem] truncate" title={esGrupo ? f.partes.map(p => inmuebleDe(p)?.direccion).join(', ') : inmuebleDe(g)?.direccion}>
                              {esGrupo ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-aqua-100 text-teal-700 text-xs font-medium">
                                  <Layers className="h-3 w-3" />
                                  {todas ? 'Todas las propiedades' : `${f.partes.length} inmuebles`}
                                </span>
                              ) : inmuebleDe(g)?.direccion}
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <p className="font-medium text-teal-700">{g.concepto}</p>
                            {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
                            {g.pagadoCon === 'FONDO' && (
                              <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-aqua-100 text-teal-700">Pagado con fondo de reserva</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{fmt(f.total)}</td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingId(editando ? null : f.key);
                                  setEditForm({
                                    concepto: g.concepto,
                                    monto: String(Math.round(f.total * 100) / 100),
                                    descripcion: (esGrupo ? sinNota(g.descripcion) : g.descripcion) || '',
                                    fecha: new Date(g.fecha).toISOString().split('T')[0],
                                    pagadoCon: g.pagadoCon === 'FONDO' ? 'FONDO' : 'CAJA',
                                  });
                                }}
                                className="p-1.5 rounded-md text-gray-500 hover:text-teal-600 hover:bg-teal-50" title={esGrupo ? 'Editar gasto común' : 'Editar'}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(f)} className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50" title={esGrupo ? 'Eliminar gasto común' : 'Eliminar'}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {editando && (
                          <tr className="bg-gray-50/70">
                            <td colSpan={cols} className="px-6 pb-4">
                              <div className="rounded-lg border border-teal-100 bg-white p-4 grid gap-3 md:grid-cols-4">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Concepto</label>
                                  <input value={editForm.concepto} onChange={e => setEditForm({ ...editForm, concepto: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">{esGrupo ? 'Monto total ($)' : 'Monto ($)'}</label>
                                  <input type="number" step="0.01" value={editForm.monto} onChange={e => setEditForm({ ...editForm, monto: e.target.value })} className={inputCls} />
                                  {esGrupo && num(editForm.monto) > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">{fmt(num(editForm.monto) / f.partes.length)} en cada uno de los {f.partes.length} inmuebles</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                                  <input type="date" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                                  <input value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} className={inputCls} />
                                </div>
                                <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                                  <span className="text-xs text-gray-500">Pagado con</span>
                                  <SelectorPagadoCon value={editForm.pagadoCon} onChange={v => setEditForm({ ...editForm, pagadoCon: v })} saldoFondo={saldoFondo} />
                                  {esGrupo && <span className="text-xs text-gray-400">Se aplica a las {f.partes.length} partes</span>}
                                </div>
                                <div className="md:col-span-4 flex justify-end gap-2">
                                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
                                  <button onClick={() => handleUpdate(f)} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-teal-500 hover:bg-teal-600">Guardar</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {abierto && (
                          <tr className="bg-gray-50/70">
                            <td colSpan={cols} className="px-6 pb-4">
                              <div className={`grid gap-4 ${esGrupo ? 'md:grid-cols-2' : ''}`}>
                                {esGrupo && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Por inmueble</p>
                                    <div className="rounded-lg bg-white border border-gray-100 divide-y divide-gray-100">
                                      {f.partes.map(p => (
                                        <div key={p.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                                          <span className="text-gray-600 truncate">{inmuebleDe(p)?.direccion}</span>
                                          <span className="font-medium text-gray-900 tabular-nums">{fmt(num(p.monto))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">Por propietario</p>
                                  {g.pagadoCon === 'FONDO' ? (
                                    <p className="text-xs text-gray-500">Pagado con el fondo de reserva común: no se descuenta de la cuenta corriente de ningún propietario.</p>
                                  ) : dist.length === 0 ? (
                                    <p className="text-xs text-gray-400">Este inmueble no tiene propietarios activos.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {dist.map(d => (
                                        <div key={d.propietarioId} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                                          <p className="text-xs text-gray-500">{d.nombre}{esGrupo ? '' : ` · ${d.porcentaje}%`}</p>
                                          <p className="text-sm font-semibold text-teal-700 tabular-nums">{fmt(d.monto)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td></td>
                    <td colSpan={mostrarColInmueble ? 3 : 2} className="px-3 py-3 text-gray-600">Total</td>
                    <td className="px-3 py-3 text-right text-teal-700 tabular-nums">{fmt(resumen.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
