// Genera los correos con datos de ejemplo en ./tmp-correos/ para verlos en el navegador.
//   node scripts/preview-emails.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resetPasswordEmail, dailyDigestEmail } from '../services/emailTemplates.js';

const logoPath = process.env.LOGO_FILE; // ruta local del PNG, para ver el logo sin desplegar
const logoUrl = logoPath && existsSync(logoPath) ? `data:image/png;base64,${readFileSync(logoPath).toString('base64')}` : undefined;
const REASONS = { spam: 'Spam', estafa: 'Posible estafa', ofensivo: 'Contenido ofensivo', falso: 'Información falsa', copyright: 'Derechos de autor', otro: 'Otro' };
const short = (s, n = 140) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const fmt = (d) => new Date(d).toLocaleDateString('es');

mkdirSync('tmp-correos', { recursive: true });
writeFileSync('tmp-correos/recuperar.html', resetPasswordEmail({ name: 'Camila', link: 'https://driftler.com/restablecer?token=abc123def456abc123def456abc123def456abc123def456', logoUrl }));
writeFileSync('tmp-correos/resumen.html', dailyDigestEmail({
  reports: [
    { reason: 'estafa', post_title: 'Trabajo en granja, pago por adelantado de $200', message: 'Piden dinero antes de empezar' },
    { reason: 'spam', post_title: 'Vendo curso de inglés <b>barato</b>', message: '' },
  ],
  contacts: [{ name: 'Matías', message: 'Hola, ¿cómo puedo borrar un aviso que publiqué por error? Gracias.' }],
  newRequests: [{ due_at: new Date(Date.now() + 4 * 864e5) }],
  dueSoon: [{ due_at: new Date(Date.now() + 36e5) }],
  panel: 'https://driftler.com/admin-dashboard',
  date: new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
  reasons: REASONS, short, fmtDate: fmt, logoUrl,
}));
console.log('Listo: tmp-correos/recuperar.html y tmp-correos/resumen.html');
