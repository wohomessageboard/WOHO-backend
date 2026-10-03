import pool from '../config/db.js';
import { sendMail, mailConfigured } from './mailer.js';

// Resumen diario para el admin: UN solo correo al día con lo nuevo de la bandeja y las
// solicitudes de eliminación. Si no hay nada, no se envía. Es seguro llamarlo varias
// veces: cada elemento se avisa una sola vez y hay un mínimo de ~20 h entre envíos.
const MIN_HOURS_BETWEEN = 20;
const REASONS = { spam: 'Spam', estafa: 'Posible estafa', ofensivo: 'Contenido ofensivo', falso: 'Información falsa', otro: 'Otro' };

const short = (s, n = 140) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);

export const sendDailyDigest = async () => {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) return { sent: false, reason: 'ADMIN_NOTIFY_EMAIL no está configurado' };

  const last = await pool.query("SELECT value FROM app_state WHERE key = 'last_digest_at'");
  if (last.rowCount > 0) {
    const hours = (Date.now() - new Date(last.rows[0].value).getTime()) / 36e5;
    if (hours < MIN_HOURS_BETWEEN) return { sent: false, reason: 'Ya se envió un resumen hoy' };
  }

  const inbox = await pool.query(
    `SELECT id, kind, reason, post_title, name, message FROM inbox_messages
     WHERE status = 'open' AND notified_at IS NULL ORDER BY created_at`
  );
  const newRequests = await pool.query(
    `SELECT id, requested_at, due_at FROM deletion_requests WHERE status = 'pending' AND notified_at IS NULL ORDER BY requested_at`
  );
  // Recordatorio: solicitudes que vencen en menos de 24 h o ya vencieron (aunque se hayan avisado antes).
  const dueSoon = await pool.query(
    `SELECT id, due_at FROM deletion_requests WHERE status = 'pending' AND notified_at IS NOT NULL AND due_at < now() + interval '1 day' ORDER BY due_at`
  );

  if (inbox.rowCount === 0 && newRequests.rowCount === 0 && dueSoon.rowCount === 0) {
    return { sent: false, reason: 'Sin novedades' };
  }

  const reports = inbox.rows.filter((r) => r.kind === 'report');
  const contacts = inbox.rows.filter((r) => r.kind === 'contact');
  const panel = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/admin-dashboard`;

  const lines = [];
  lines.push(`Novedades de WOHO (${new Date().toLocaleDateString('es')}):`, '');
  if (reports.length) {
    lines.push(`REPORTES NUEVOS (${reports.length})`);
    reports.forEach((r) => lines.push(`- ${REASONS[r.reason] || r.reason}: «${short(r.post_title, 80)}»${r.message ? ' — ' + short(r.message) : ''}`));
    lines.push('');
  }
  if (contacts.length) {
    lines.push(`MENSAJES DE CONTACTO (${contacts.length})`);
    contacts.forEach((c) => lines.push(`- ${short(c.name, 40)}: ${short(c.message)}`));
    lines.push('');
  }
  if (newRequests.rowCount) {
    lines.push(`SOLICITUDES DE ELIMINACIÓN NUEVAS (${newRequests.rowCount})`);
    newRequests.rows.forEach((r) => lines.push(`- Plazo hasta el ${new Date(r.due_at).toLocaleDateString('es')}`));
    lines.push('');
  }
  if (dueSoon.rowCount) {
    lines.push(`ELIMINACIONES POR VENCER O VENCIDAS (${dueSoon.rowCount})`);
    dueSoon.rows.forEach((r) => lines.push(`- Plazo: ${new Date(r.due_at).toLocaleDateString('es')}`));
    lines.push('');
  }
  lines.push(`Abrir el panel: ${panel}`);

  await sendMail({
    to: adminEmail,
    subject: `WOHO: ${reports.length + contacts.length} mensaje(s) y ${newRequests.rowCount + dueSoon.rowCount} solicitud(es) de eliminación`,
    text: lines.join('\n'),
  });

  // Solo se marca como avisado si el envío no falló (sendMail lanza error en ese caso).
  if (inbox.rowCount) await pool.query('UPDATE inbox_messages SET notified_at = now() WHERE id = ANY($1)', [inbox.rows.map((r) => r.id)]);
  if (newRequests.rowCount) await pool.query('UPDATE deletion_requests SET notified_at = now() WHERE id = ANY($1)', [newRequests.rows.map((r) => r.id)]);
  await pool.query(
    `INSERT INTO app_state (key, value) VALUES ('last_digest_at', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [new Date().toISOString()]
  );

  return { sent: true, simulated: !mailConfigured(), reports: reports.length, contacts: contacts.length, deletions: newRequests.rowCount, reminders: dueSoon.rowCount };
};
