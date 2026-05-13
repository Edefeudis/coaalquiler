import './globals.css';

export const metadata = {
  title: 'Panel de Propietarios',
  description: 'Gestión de inmuebles y alquileres',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
