import * as fs from 'fs';
import * as path from 'path';

/**
 * Backup automático de la base de datos SQLite con rotación de 5 versiones.
 * Se ejecuta al inicio de la aplicación.
 */

const DB_PATH = path.resolve(__dirname, '../../prisma/dev.db');
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUPS = 5;
const PREFIX = 'dev_';

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`  Directorio de backups creado: ${BACKUP_DIR}`);
  }
}

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '_' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function listBackups(): string[] {
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db'))
    .sort() // Los nombres con timestamp se ordenan cronológicamente
    .reverse(); // Más reciente primero
}

function removeOldestIfNecessary(): void {
  const backups = listBackups();
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      const filePath = path.join(BACKUP_DIR, file);
      fs.unlinkSync(filePath);
      console.log(`  Backup antiguo eliminado: ${file}`);
    }
  }
}

function createBackup(): void {
  if (!fs.existsSync(DB_PATH)) {
    console.log('  Base de datos no encontrada, se omite backup.');
    return;
  }

  ensureBackupDir();

  const timestamp = getTimestamp();
  const backupFile = `${PREFIX}${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFile);

  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`  Backup creado: ${backupFile}`);

  // Eliminar backups antiguos si hay más de MAX_BACKUPS
  removeOldestIfNecessary();

  // Mostrar resumen
  const remaining = listBackups();
  console.log(`  Backups almacenados: ${remaining.length}/${MAX_BACKUPS} (${remaining[0]} ... ${remaining[remaining.length - 1]})`);
}

// Ejecutar
createBackup();