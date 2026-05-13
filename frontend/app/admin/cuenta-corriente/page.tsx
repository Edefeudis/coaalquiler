'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCuentaCorrientePage() {
  const [loading, setLoading] = useState(false);
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [selectedPropietario, setSelectedPropietario] = useState<number | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [showAjusteForm, setShowAjusteForm] = useState(false);
  const [showDistribucionForm, setShowDistribucionForm] = useState(false);
  const [showDetalleRecalculo, setShowDetalleRecalculo] = useState(false);
  const [detalleRecalculo, setDetalleRecalculo] = useState<any>(null);
  const [ultimaDistribucion, setUltimaDistribucion] = useState<any>(null);
  const [ajusteForm, setAjusteForm] = useState({
    propietarioId: '',
    monto: '',
    tipo: 'POSITIVO' as 'POSITIVO' | 'NEGATIVO',
    descripcion: ''
  });
  const [distribucionForm, setDistribucionForm] = useState({
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
        headers: { 
          'Authorization': `Bearer ${token}`
        }
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
      console.log('fetchResumenPropietario llamado con ID:', propietarioId);
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/resumen`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Respuesta resumen:', res.status, res.statusText);
      if (res.ok) {
        const data = await res.json();
        console.log('Datos resumen:', data);
        setResumen(data);
      } else {
        console.error('Error en respuesta:', res.status);
      }
    } catch (err) {
      console.error('Error fetching resumen:', err);
    }
  }

  async function fetchSaldoPropietario(propietarioId: number): Promise<number> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${propietarioId}/saldo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // El endpoint puede devolver un número directo o un objeto { saldo }
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
        headers: { 
          'Authorization': `Bearer ${token}`
        }
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
    console.log('handlePropietarioChange llamado con:', propietarioId);
    const id = parseInt(propietarioId);
    console.log('ID parseado:', id, 'type:', typeof id);
    setSelectedPropietario(id);
    if (id && !isNaN(id)) {
      console.log('Cargando datos para propietario:', id);
      fetchResumenPropietario(id);
      fetchMovimientosPropietario(id);
    } else {
      console.log('No hay ID válido, limpiando datos');
      setResumen(null);
      setMovimientos([]);
    }
  }

  async function handleAjusteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/cuenta-corriente/ajuste', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propietarioId: parseInt(ajusteForm.propietarioId),
          monto: parseFloat(ajusteForm.monto),
          tipo: ajusteForm.tipo,
          descripcion: ajusteForm.descripcion
        })
      });
      
      if (res.ok) {
        setShowAjusteForm(false);
        setAjusteForm({
          propietarioId: '',
          monto: '',
          tipo: 'POSITIVO',
          descripcion: ''
        });
        
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
        }
        
        alert('Ajuste registrado exitosamente');
      } else {
        alert('Error al registrar ajuste');
      }
    } catch (err) {
      console.error('Error creating ajuste:', err);
      alert('Error al registrar ajuste');
    } finally {
      setLoading(false);
    }
  }

  async function handleDistribucionSubmit(e: React.FormEvent) {
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
          propietarioId: parseInt(distribucionForm.propietarioId),
          tipoMovimiento: 'DEBITO',
          monto: parseFloat(distribucionForm.monto),
          descripcion: distribucionForm.descripcion || 'Distribución manual de fondos'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUltimaDistribucion(data);
        setShowDistribucionForm(false);
        setDistribucionForm({
          propietarioId: '',
          monto: '',
          descripcion: ''
        });
        
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
        }
        
        // Generar PDF automáticamente
        await generarReciboDistribucion(data);
        
        alert('Distribución realizada exitosamente');
      } else {
        alert('Error al realizar distribución');
      }
    } catch (err) {
      console.error('Error creating distribución:', err);
      alert('Error al realizar distribución');
    } finally {
      setLoading(false);
    }
  }

  async function eliminarDistribucion(id: number) {
    if (!confirm('¿Está seguro de eliminar esta distribución? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/movimiento/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert('Distribución eliminada exitosamente');
        if (selectedPropietario) {
          fetchResumenPropietario(selectedPropietario);
          fetchMovimientosPropietario(selectedPropietario);
        }
      } else {
        const errorText = await res.text();
        alert(`Error al eliminar distribución: ${errorText}`);
      }
    } catch (err: any) {
      console.error('Error eliminando distribución:', err);
      alert(`Error al eliminar distribución: ${err.message || err}`);
    }
  }

  async function handleRecalcularSaldos() {
    if (!selectedPropietario) {
      alert('Seleccione un propietario primero');
      return;
    }

    if (!confirm('¿Está seguro de recalcular todos los saldos del propietario? Esta acción puede tomar tiempo.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log(`Intentando recalcular saldos para propietario ${selectedPropietario}`);
      
      const res = await fetch(`http://localhost:3000/api/cuenta-corriente/propietario/${selectedPropietario}/recalcular`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Respuesta del servidor:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Datos recibidos:', data);
        setDetalleRecalculo(data);
        setShowDetalleRecalculo(true);
        fetchResumenPropietario(selectedPropietario);
        fetchMovimientosPropietario(selectedPropietario);
        alert('Saldos recalculados exitosamente');
      } else {
        const errorText = await res.text();
        console.log('Error response:', errorText);
        alert(`Error al recalcular saldos: ${res.status} - ${errorText}`);
      }
    } catch (err: any) {
      console.error('Error recalculando saldos:', err);
      alert(`Error al recalcular saldos: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  function getTipoMovimientoColor(tipo: string) {
    switch (tipo) {
      case 'CREDITO':
      case 'DISTRIBUCION':
      case 'AJUSTE_POSITIVO':
        return 'text-green-600';
      case 'DEBITO':
      case 'GASTO':
      case 'AJUSTE_NEGATIVO':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  function getTipoMovimientoIcon(tipo: string) {
    switch (tipo) {
      case 'CREDITO':
      case 'DISTRIBUCION':
      case 'AJUSTE_POSITIVO':
        return '↑';
      case 'DEBITO':
      case 'GASTO':
      case 'AJUSTE_NEGATIVO':
        return '↓';
      default:
        return '→';
    }
  }

  async function generarEstadoCuenta() {
    if (!selectedPropietario || !propietarios) return;

    const propietario = propietarios.find(p => p.id === selectedPropietario);
    if (!propietario) return;

    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();

      // Título
      doc.setFontSize(20);
      doc.text('ESTADO DE CUENTA', 105, 20, { align: 'center' });

      // Datos del propietario
      doc.setFontSize(14);
      doc.text(`Propietario: ${propietario.nombre}`, 20, 35);
      doc.setFontSize(11);
      doc.text(`Email: ${propietario.email}`, 20, 45);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, 20, 55);

      // Resumen
      doc.setFontSize(14);
      doc.text('RESUMEN', 20, 70);
      doc.setFontSize(12);
      
      let totalCreditos = 0;
      let totalDebitos = 0;
      for (const mov of movimientos) {
        if (mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'DISTRIBUCION' || mov.tipoMovimiento === 'AJUSTE_POSITIVO') {
          totalCreditos += mov.monto;
        } else {
          totalDebitos += mov.monto;
        }
      }
      const saldoFinal = totalCreditos - totalDebitos;

      doc.text(`Total Créditos: $${totalCreditos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 20, 82);
      doc.text(`Total Débitos: $${totalDebitos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 20, 92);
      doc.text(`Saldo Final: $${saldoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 20, 102);

      // Línea separadora
      doc.line(20, 110, 190, 110);

      // Movimientos
      doc.setFontSize(14);
      doc.text('MOVIMIENTOS', 20, 122);
      doc.setFontSize(10);
      
      if (movimientos.length === 0) {
        doc.text('No hay movimientos registrados', 20, 135);
      } else {
        // Encabezados de tabla
        doc.setFontSize(9);
        doc.text('Fecha', 20, 135);
        doc.text('Tipo', 50, 135);
        doc.text('Descripción', 75, 135);
        doc.text('Monto', 170, 135, { align: 'right' });
        doc.line(20, 138, 190, 138);

        let yPosition = 145;
        const displayedMovimientos = movimientos.slice(0, 30); // Últimos 30 movimientos

        doc.setFontSize(8);
        for (const mov of displayedMovimientos) {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
            // Repetir encabezados en nueva página
            doc.setFontSize(9);
            doc.text('Fecha', 20, yPosition);
            doc.text('Tipo', 50, yPosition);
            doc.text('Descripción', 75, yPosition);
            doc.text('Monto', 170, yPosition, { align: 'right' });
            yPosition += 5;
            doc.line(20, yPosition, 190, yPosition);
            yPosition += 5;
            doc.setFontSize(8);
          }

          const fecha = new Date(mov.fecha).toLocaleDateString('es-AR');
          const tipo = mov.tipoMovimiento;
          const desc = (mov.descripcion || mov.referencia || '-').substring(0, 40);
          const monto = `$${mov.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
          const signo = (mov.tipoMovimiento === 'CREDITO' || mov.tipoMovimiento === 'DISTRIBUCION' || mov.tipoMovimiento === 'AJUSTE_POSITIVO') ? '+' : '-';

          doc.text(fecha, 20, yPosition);
          doc.text(tipo, 50, yPosition);
          doc.text(desc, 75, yPosition);
          doc.text(`${signo} ${monto}`, 170, yPosition, { align: 'right' });

          yPosition += 8;
        }
      }

      // Footer
      doc.setFontSize(10);
      doc.text('Este documento es un estado de cuenta electrónico válido', 105, 280, { align: 'center' });

      // Guardar PDF
      doc.save(`Estado_Cuenta_${propietario.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generando estado de cuenta:', err);
      alert('Error al generar estado de cuenta. Verifique la consola para más detalles.');
    }
  }

  async function generarReciboDistribucion(distribucion: any) {
    try {
      console.log('Generando recibo de distribución:', distribucion);
      
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('RECIBO DE DISTRIBUCIÓN', 105, 20, { align: 'center' });
      
      // Información del propietario
      doc.setFontSize(12);
      doc.text(`Propietario: ${distribucion.propietario?.nombre || 'N/A'}`, 20, 40);
      doc.text(`Email: ${distribucion.propietario?.email || 'N/A'}`, 20, 50);
      
      // Detalles de la distribución
      doc.text(`Fecha: ${new Date(distribucion.fecha || Date.now()).toLocaleDateString('es-AR')}`, 20, 65);
      doc.text(`Monto: ${formatCurrency(distribucion.monto)}`, 20, 75);
      doc.text(`Descripción: ${distribucion.descripcion || 'Distribución manual de fondos'}`, 20, 85);
      
      // Línea separadora
      doc.line(20, 95, 190, 95);
      
      // Movimientos recientes
      doc.setFontSize(14);
      doc.text('Movimientos Recientes', 20, 110);
      
      doc.setFontSize(10);
      let yPosition = 125;
      
      if (movimientos.length > 0) {
        const ultimosMovimientos = movimientos.slice(0, 5); // Últimos 5 movimientos
        ultimosMovimientos.forEach((movimiento: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`${new Date(movimiento.fecha).toLocaleDateString('es-AR')} - ${movimiento.tipoMovimiento}`, 20, yPosition);
          doc.text(`${formatCurrency(movimiento.monto)} - Saldo: ${formatCurrency(movimiento.saldoNuevo)}`, 20, yPosition + 8);
          
          yPosition += 20;
        });
      } else {
        doc.text('No hay movimientos recientes', 20, 125);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.text('Este documento es un recibo electrónico válido', 105, 280, { align: 'center' });
      doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, 105, 285, { align: 'center' });
      
      // Guardar PDF
      doc.save(`Recibo_Distribucion_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (err) {
      console.error('Error generando recibo:', err);
      alert('Error al generar recibo. Verifique la consola para más detalles.');
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
              <h1 className="text-xl font-bold text-gray-900">Cuenta Corriente</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDistribucionForm(!showDistribucionForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {showDistribucionForm ? 'Cancelar' : 'Distribuir Fondos'}
              </button>
              <button
                onClick={() => setShowAjusteForm(!showAjusteForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showAjusteForm ? 'Cancelar' : 'Ajuste Manual'}
              </button>
              {selectedPropietario && (
                <>
                  <button
                    onClick={generarEstadoCuenta}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Estado de Cuenta
                  </button>
                  <button
                    onClick={handleRecalcularSaldos}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Recalculando...' : 'Recalcular Saldos'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selector de propietarios */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Propietario</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
            <select
              value={selectedPropietario || ''}
              onChange={e => handlePropietarioChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar propietario</option>
              {propietarios.map((propietario) => (
                <option key={propietario.id} value={propietario.id}>
                  {propietario.nombre} ({propietario.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulario de distribución */}
        {showDistribucionForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Distribuir Fondos</h2>
            <form onSubmit={handleDistribucionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                  <select
                    value={distribucionForm.propietarioId}
                    onChange={async e => {
                      const propietarioId = e.target.value;
                      setDistribucionForm({...distribucionForm, propietarioId, monto: '', descripcion: ''});
                      if (propietarioId) {
                        const saldo = await fetchSaldoPropietario(parseInt(propietarioId));
                        console.log('Saldo obtenido:', saldo);
                        setDistribucionForm(prev => ({...prev, monto: saldo.toString()}));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar propietario</option>
                    {propietarios.map((propietario) => (
                      <option key={propietario.id} value={propietario.id}>
                        {propietario.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a distribuir ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={distribucionForm.monto}
                    onChange={e => setDistribucionForm({...distribucionForm, monto: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {distribucionForm.propietarioId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Saldo disponible sugeridor - puede modificar
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={distribucionForm.descripcion}
                  onChange={e => setDistribucionForm({...distribucionForm, descripcion: e.target.value})}
                  placeholder="Descripción de la distribución"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Distribuyendo...' : 'Distribuir Fondos'}
              </button>
            </form>
          </div>
        )}

        {/* Formulario de ajuste manual */}
        {showAjusteForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Ajuste Manual</h2>
            <form onSubmit={handleAjusteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                  <select
                    value={ajusteForm.propietarioId}
                    onChange={e => setAjusteForm({...ajusteForm, propietarioId: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar propietario</option>
                    {propietarios.map((propietario) => (
                      <option key={propietario.id} value={propietario.id}>
                        {propietario.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={ajusteForm.tipo}
                    onChange={e => setAjusteForm({...ajusteForm, tipo: e.target.value as 'POSITIVO' | 'NEGATIVO'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="POSITIVO">Ajuste Positivo</option>
                    <option value="NEGATIVO">Ajuste Negativo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ajusteForm.monto}
                    onChange={e => setAjusteForm({...ajusteForm, monto: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={ajusteForm.descripcion}
                    onChange={e => setAjusteForm({...ajusteForm, descripcion: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrar Ajuste'}
              </button>
            </form>
          </div>
        )}

        {/* Resumen de cuenta corriente */}
        {resumen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saldo General</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(resumen.saldoGeneral)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Propiedades</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {resumen.saldosPorInmueble.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Últimos Movimientos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {resumen.ultimosMovimientos.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detalle del recálculo */}
        {showDetalleRecalculo && detalleRecalculo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Detalle del Recálculo de Saldos</h2>
              <button
                onClick={() => setShowDetalleRecalculo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">Total Cobros</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(detalleRecalculo.totalCobrosPropietario)}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">Total Gastos</h3>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(detalleRecalculo.totalGastosPropietario)}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-800 mb-2">Distribuciones Realizadas</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(detalleRecalculo.totalDistribucionesPropietario)}
                </p>
              </div>
              <div className={`${(detalleRecalculo.saldoDisponible || detalleRecalculo.saldoFinal) >= 0 ? 'bg-blue-50' : 'bg-red-50'} rounded-lg p-4`}>
                <h3 className={`text-sm font-medium mb-2 ${(detalleRecalculo.saldoDisponible || detalleRecalculo.saldoFinal) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  Saldo Disponible
                </h3>
                <p className={`text-2xl font-bold ${(detalleRecalculo.saldoDisponible || detalleRecalculo.saldoFinal) >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                  {formatCurrency(detalleRecalculo.saldoDisponible || detalleRecalculo.saldoFinal)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Total Cobros - (Total Gastos + Distribuciones)
                </p>
              </div>
            </div>

            {/* Detalle por inmueble */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle por Inmueble</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inmueble
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Porcentaje
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cobros
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cobros Propietario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Gastos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gastos Propietario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distribuciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detalleRecalculo.detallesPorInmueble.map((detalle: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detalle.inmueble.direccion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detalle.porcentaje}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(detalle.totalCobros)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(detalle.cobrosPropietario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(detalle.totalGastos)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {formatCurrency(detalle.gastosPropietario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                          {formatCurrency(detalle.totalDistribuciones)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${detalle.saldoActual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(detalle.saldoActual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Movimientos */}
        {movimientos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Historial de Movimientos</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movimiento.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getTipoMovimientoColor(movimiento.tipoMovimiento)}`}>
                          {getTipoMovimientoIcon(movimiento.tipoMovimiento)} {movimiento.tipoMovimiento}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {movimiento.descripcion || movimiento.referencia || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTipoMovimientoColor(movimiento.tipoMovimiento)}`}>
                        {movimiento.tipoMovimiento.includes('POSITIVO') || movimiento.tipoMovimiento === 'CREDITO' || movimiento.tipoMovimiento === 'DISTRIBUCION' ? '+' : '-'}
                        {formatCurrency(movimiento.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(movimiento.saldoNuevo)}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movimiento.tipoMovimiento === 'DEBITO' && (
                            <button
                              onClick={() => eliminarDistribucion(movimiento.referenciaId || movimiento.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recibo de última distribución */}
        {ultimaDistribucion && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-green-800">Última Distribución Realizada</h3>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(ultimaDistribucion.monto)} - {new Date(ultimaDistribucion.fecha).toLocaleDateString('es-AR')}
                </p>
              </div>
              <button
                onClick={() => generarReciboDistribucion(ultimaDistribucion)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Descargar Recibo
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
