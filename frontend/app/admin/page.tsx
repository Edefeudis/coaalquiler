'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      console.log('Login response:', data);
      if (!res.ok) throw new Error(data.message || 'Error de login');
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('Token guardado:', data.accessToken ? `${data.accessToken.substring(0, 20)}...` : 'NO TOKEN');
      console.log('User guardado:', data.user);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-md border border-teal-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-teal-700">Panel de Administración</h1>
          <p className="text-teal-500 mt-2">Ingreso para administradores y empleados</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-teal-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-teal-600 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-copper-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-copper-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-teal-500 hover:text-teal-600 text-sm transition-colors">
            ← Volver al login de propietarios
          </a>
        </div>
      </div>
    </main>
  );
}
