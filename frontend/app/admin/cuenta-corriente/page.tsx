'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCuentaCorrientePage() {
  const [loading, setLoading] = useState(false);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [selectedPropietario, setSelectedPropietario] = useState<number | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [showDetalleRecalculo, setShowDetalleRecalculo] = useState(false);
  const [detalleRecalculo, setDetalleRecalculo] = useState<any>(null);
  const [ultimoPago, setUltimoPago] = useState<any>(null);
  const [pagoForm, setPagoForm] = useState({
    propietarioId: '',
    monto: '',
    descripcion: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchPropietarios();
  }, [router]);

  async function fetchPropietarios() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/propietarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPropietarios(data);
      }
    } catch (err) {
      console.error('Error fetching propietarios:', err);
    }
  }

  async function fetchResumenPropietario(propietarioId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResumen(data);
      }
    } catch (err) {
      console.error('Error fetching resumen:', err);
    }
  }

  async function fetchSaldoPropietario(propietarioId: number): Promise<number> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/saldo`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return typeof data === 'number' ? data : (data.saldo || 0);
      }
    } catch (err) {
      console.error('Error fetching saldo:', err);
    }
    return 0;
  }

  async function fetchMovimientosPropietario(propietarioId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/movimientos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
      }
    } catch (err) {
      console.error('Error fetching movimientos:', err);
    }
  }

  async function handlePropietarioChange(propietarioId: string) {
    const id = parseInt(propietarioId);
    setSelectedPropietario(id);
    if (id && !isNaN(id)) {
      fetchResumenPropietario(id);
      fetchMovimientosPropietario(id);
      // Auto cargar saldo en el formulario de pago
      const saldo = await fetchSaldoPropietario(id);
      setPagoForm(prev => ({ ...prev, propietarioId: id.toString(), monto: saldo > 0 ? saldo.toString() : '' }));
    } else {
      setResumen(null);
      setMovimientos([]);
    }
  }

  async function handlePagoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/cuenta-corriente/movimiento', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propietarioId: parseInt(pagoForm.propietarioId),
          tipoMovimiento: 'DEBITO',
          monto: parseFloat(pagoForm.monto),
          descripcion: pagoForm.descripcion || 'Pago/Retiro de fondos'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUltimoPago(data);
        setShowPagoForm(false);
        
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
          const saldo = await fetchSaldoPropietario(selectedPropietario);
          setPagoForm({ propietarioId: selectedPropietario.toString(), monto: saldo > 0 ? saldo.toString() : '', descripcion: '' });
        }
        
        alert('Pago registrado exitosamente');
      } else {
        alert('Error al registrar pago');
      }
    } catch (err) {
      console.error('Error creating pago:', err);
      alert('Error al registrar pago');
    } finally {
      setLoading(false);
    }
  }

  async function eliminarMovimiento(id: number) {
    if (!confirm('¿Está seguro de eliminar este movimiento?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/movimiento/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Movimiento eliminado');
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
        }
      } else {
        const errText = await res.text();
        alert(`Error: ${errText}`);
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    }
  }

  async function handleRecalcularSaldos() {
    if (!selectedPropietario) {
      alert('Seleccione un propietario primero');
      return;
    }
    if (!confirm('¿Recalcular saldos? Esto revisa todos los cobros, gastos y distribuciones.')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${selectedPropietario}/recalcular`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetalleRecalculo(data);
        setShowDetalleRecalculo(true);
        fetchResumenPropietario(selectedPropietario);
        fetchMovimientosPropietario(selectedPropietario);
        alert('Saldos recalculados');
      } else {
        alert(`Error: ${await res.text()}`);
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  }

  function getTipoMovimientoColor(tipo: string) {
    switch (tipo) {
      case 'CREDITO': case 'DISTRIBUCION': case 'AJUSTE_POSITIVO': return 'text-teal-600 bg-teal-50';
      case 'DEBITO': case 'GASTO': case 'AJUSTE_NEGATIVO': return 'text-copper-600 bg-copper-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  const propietarioSeleccionado = propietarios.find(p => p.id === selectedPropietario);
  const saldoDisponible = resumen?.saldoGeneral || 0;

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-teal-700 shadow-lg border-b border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-[#B8E6E6] hover:text-white transition-colors">
                ← Dashboard
              </a>
              <h1 className="text-xl font-bold text-[#F5F0EB]">Cuenta Corriente</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de propietario */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-teal-100">
          <h2 className="text-xl font-bold text-teal-700 mb-4">Seleccionar Propietario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-teal-600 mb-1">Propietario</label>
              <select
                value={selectedPropietario || ''}
                onChange={e => handlePropietarioChange(e.target.value)}
                className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400 text-black"
              >
                <option value="">Seleccionar propietario</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id} className="text-black">
                    {p.nombre} ({p.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              {selectedPropietario && (
                <>
                  <button
                    onClick={() => setShowPagoForm(!showPagoForm)}
                    className={`px-4 py-2 rounded-md transition-colors text-white ${
                      showPagoForm ? 'bg-gray-400' : 'bg-copper-400 hover:bg-copper-500'
                    }`}
                  >
                    {showPagoForm ? 'Cancelar' : 'Registrar Pago'}
                  </button>
                  <button
                    onClick={handleRecalcularSaldos}
                    disabled={loading}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {loading ? '...' : 'Recalcular'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* BANNER PRINCIPAL - Saldo disponible */}
        {selectedPropietario && propietarioSeleccionado && (
          <div className={`rounded-lg shadow-lg p-8 mb-6 ${
            saldoDisponible > 0 
              ? 'bg-gradient-to-r from-teal-600 to-teal-500' 
              : saldoDisponible === 0 
              ? 'bg-gradient-to-r from-gray-400 to-gray-300'
              : 'bg-gradient-to-r from-copper-500 to-copper-400'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white text-sm opacity-90 mb-1">Propietario</p>
                <h2 className="text-white text-2xl font-bold mb-4">{propietarioSeleccionado.nombre}</h2>
                <p className={`text-5xl font-bold ${saldoDisponible >= 0 ? 'text-white' : 'text-white'}`}>
                  {formatCurrency(saldoDisponible)}
                </p>
                <p className="text-white text-sm opacity-80 mt-2">
                  {saldoDisponible > 0 
                    ? '💰 Monto disponible para transferir al propietario' 
                    : saldoDisponible === 0
                    ? '✓ No hay fondos pendientes'
                    : '⚠ Saldo negativo - el propietario debe fondos'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white text-sm opacity-90 mb-1">Email</p>
                <p className="text-white font-medium">{propietarioSeleccionado.email}</p>
                {saldoDisponible > 0 && (
                  <button
                    onClick={() => setShowPagoForm(true)}
                    className="mt-4 px-6 py-3 bg-white text-teal-700 font-bold rounded-lg hover:bg-[#F5F0EB] transition-colors shadow-lg"
                  >
                    Transferir {formatCurrency(saldoDisponible)}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Formulario de pago */}
        {showPagoForm && selectedPropietario && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-copper-300">
            <h2 className="text-xl font-bold text-teal-700 mb-4">
              {saldoDisponible > 0 ? `✓ Hay ${formatCurrency(saldoDisponible)} disponibles para transferir` : 'Registrar Pago/Retiro'}
            </h2>
            <form onSubmit={handlePagoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-teal-600 mb-1">Propietario</label>
                  <input
                    type="text"
                    value={propietarioSeleccionado?.nombre || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-600 mb-1">
                    Monto a pagar/transferir ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pagoForm.monto}
                    onChange={e => setPagoForm({...pagoForm, monto: e.target.value})}
                    required
                    max={saldoDisponible}
                    className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400 text-black"
                  />
                  {saldoDisponible > 0 && (
                    <p className="text-xs text-teal-500 mt-1">
                      Máximo disponible: {formatCurrency(saldoDisponible)}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={pagoForm.descripcion}
                  onChange={e => setPagoForm({...pagoForm, descripcion: e.target.value})}
                  placeholder="Ej: Transferencia mayo, Retiro parcial, etc."
                  className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400 text-black"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-copper-400 hover:bg-copper-500 text-white rounded-md transition-colors disabled:opacity-50 font-bold"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pago'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPagoForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Detalle de recálculo */}
        {showDetalleRecalculo && detalleRecalculo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-teal-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-teal-700">Detalle Completo de Saldos</h2>
              <button onClick={() => setShowDetalleRecalculo(false)} className="text-teal-400 hover:text-teal-600">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                <p className="text-sm text-teal-600 mb-1">Total Cobros (tu parte)</p>
                <p className="text-2xl font-bold text-teal-700">{formatCurrency(detalleRecalculo.totalCobrosPropietario)}</p>
              </div>
              <div className="bg-copper-50 rounded-lg p-4 border border-copper-100">
                <p className="text-sm text-copper-600 mb-1">Total Gastos (tu parte)</p>
                <p className="text-2xl font-bold text-copper-600">{formatCurrency(detalleRecalculo.totalGastosPropietario)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <p className="text-sm text-orange-600 mb-1">Ya transferido</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(detalleRecalculo.totalDistribucionesPropietario)}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4 border-2 border-teal-300">
                <p className="text-sm text-teal-700 mb-1 font-bold">SALDO DISPONIBLE</p>
                <p className="text-3xl font-bold text-teal-700">{formatCurrency(detalleRecalculo.saldoFinal)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50">
                    <th className="px-3 py-2 text-left text-teal-700">Inmueble</th>
                    <th className="px-3 py-2 text-right text-teal-700">%</th>
                    <th className="px-3 py-2 text-right text-teal-700">Cobros</th>
                    <th className="px-3 py-2 text-right text-teal-700">Tu parte</th>
                    <th className="px-3 py-2 text-right text-teal-700">Gastos</th>
                    <th className="px-3 py-2 text-right text-teal-700">Tu parte</th>
                    <th className="px-3 py-2 text-right text-teal-700">Transferido</th>
                    <th className="px-3 py-2 text-right text-teal-700">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleRecalculo.detallesPorInmueble?.map((detalle: any, idx: number) => (
                    <tr key={idx} className="border-b border-teal-50">
                      <td className="px-3 py-2 text-teal-700">{detalle.inmueble.direccion}</td>
                      <td className="px-3 py-2 text-right text-teal-600">{detalle.porcentaje}%</td>
                      <td className="px-3 py-2 text-right text-teal-600">{formatCurrency(detalle.totalCobros)}</td>
                      <td className="px-3 py-2 text-right font-medium text-teal-700">{formatCurrency(detalle.cobrosPropietario)}</td>
                      <td className="px-3 py-2 text-right text-teal-600">{formatCurrency(detalle.totalGastos)}</td>
                      <td className="px-3 py-2 text-right text-copper-600">{formatCurrency(detalle.gastosPropietario)}</td>
                      <td className="px-3 py-2 text-right text-copper-600">{formatCurrency(detalle.totalDistribuciones)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${detalle.saldoActual >= 0 ? 'text-teal-600' : 'text-copper-600'}`}>
                        {formatCurrency(detalle.saldoActual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumen de inmuebles - Último mes */}
        {resumen && resumen.saldosPorInmueble && resumen.saldosPorInmueble.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-teal-100">
            <h2 className="text-lg font-bold text-teal-700 mb-4">Distribución por Propiedad - Último Mes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumen.saldosPorInmueble.map((item: any, idx: number) => (
                <div key={idx} className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                  <p className="font-semibold text-teal-700 text-sm mb-2">{item.inmueble.direccion}</p>
                  {item.periodo ? (
                    <>
                      <p className={`text-xl font-bold ${item.saldo >= 0 ? 'text-teal-600' : 'text-copper-600'}`}>
                        {formatCurrency(item.saldo)}
                      </p>
                      <p className="text-xs text-teal-500 mt-1">
                        Período {item.periodo} · Cobro bruto {formatCurrency(item.montoBruto)} · Tu parte {item.porcentajePropietario}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-gray-400">$0</p>
                      <p className="text-xs text-gray-400 mt-1">Sin cobros registrados</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movimientos */}
        {movimientos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-teal-100">
            <h2 className="text-lg font-bold text-teal-700 mb-4">Historial de Movimientos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50">
                    <th className="px-3 py-2 text-left text-teal-700">Fecha</th>
                    <th className="px-3 py-2 text-left text-teal-700">Tipo</th>
                    <th className="px-3 py-2 text-left text-teal-700">Concepto</th>
                    <th className="px-3 py-2 text-right text-teal-700">Monto</th>
                    <th className="px-3 py-2 text-right text-teal-700">Saldo</th>
                    <th className="px-3 py-2 text-center text-teal-700">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => {
                    const isCredito = mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'DISTRIBUCION' || mov.tipoMovimiento === 'AJUSTE_POSITIVO';
                    const isDebito = mov.tipoMovimiento === 'DEBITO' || mov.tipoMovimiento === 'GASTO' || mov.tipoMovimiento === 'AJUSTE_NEGATIVO';
                    return (
                      <tr key={mov.id} className="border-b border-teal-50 hover:bg-teal-50/50">
                        <td className="px-3 py-2 text-teal-700">
                          {new Date(mov.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCredito ? 'bg-teal-100 text-teal-700' : 'bg-copper-100 text-copper-600'
                          }`}>
                            {mov.tipoMovimiento}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-teal-600">{mov.descripcion || mov.referencia || '-'}</td>
                        <td className={`px-3 py-2 text-right font-medium ${isCredito ? 'text-teal-600' : 'text-copper-600'}`}>
                          {isCredito ? '+' : '-'}{formatCurrency(mov.monto)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-teal-700">
                          {formatCurrency(mov.saldoNuevo)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {mov.tipoMovimiento === 'DEBITO' && (
                            <button
                              onClick={() => eliminarMovimiento(mov.referenciaId || mov.id)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!selectedPropietario && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-teal-100">
            <p className="text-4xl mb-4">🏦</p>
            <h2 className="text-xl font-bold text-teal-700 mb-2">Seleccioná un propietario</h2>
            <p className="text-teal-500">Elegí un propietario arriba para ver su saldo disponible y movimientos</p>
          </div>
        )}

        {selectedPropietario && movimientos.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-teal-100 mt-6">
            <p className="text-4xl mb-4">📭</p>
            <h2 className="text-xl font-bold text-teal-700 mb-2">Sin movimientos</h2>
            <p className="text-teal-500">Este propietario no tiene movimientos registrados en su cuenta corriente</p>
          </div>
        )}
      </div>
    </main>
  );
}