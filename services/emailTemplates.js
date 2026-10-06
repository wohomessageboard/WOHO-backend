// Plantillas HTML de los correos de Driftler. Los clientes de correo no soportan CSS externo ni
// fuentes web, así que todo va en estilos en línea, con tablas y tipografías de sistema.
// Paleta del sitio: crema #FFF9EA, tinta #18130F, tomate #EE4B2B, amarillo #FFD23F.
// Cada plantilla devuelve el HTML como texto; el texto plano lo arma quien envía (alternativa
// para clientes sin HTML y mejor entregabilidad).
import { frontendUrl } from '../config/urls.js';

const C = { cream: '#FFF9EA', ink: '#18130F', tomato: '#EE4B2B', deep: '#B8321A', yellow: '#FFD23F', muted: '#5B5249', line: '#E6DBB8' };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

// Todo lo que viene de personas usuarias (nombres, mensajes, títulos) se escapa: nunca es HTML.
export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
    <tr><td style="background:${C.ink};border-radius:10px;">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 26px;font:700 16px ${SANS};color:${C.cream};text-decoration:none;border-radius:10px;">${esc(label)}</a>
    </td></tr>
  </table>`;

// Estructura común: franja amarilla de marca, tarjeta crema con borde de tinta, logo, contenido y pie.
export const layout = ({ preheader, title, body, footer, logoUrl }) => {
  const logo = logoUrl || `${frontendUrl()}/email-logo.png`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.yellow};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.yellow};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.yellow};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};border:2px solid ${C.ink};border-radius:14px;border-collapse:separate;">
      <tr><td align="center" style="background:${C.ink};color:${C.cream};font:12px ${MONO};letter-spacing:2px;padding:10px 20px;border-radius:11px 11px 0 0;">DRIFTLER &middot; WORKING HOLIDAY</td></tr>
      <tr><td style="padding:26px 32px 4px;">
        <a href="${esc(frontendUrl())}" target="_blank" style="text-decoration:none;"><img src="${esc(logo)}" width="200" alt="Driftler" style="display:block;width:200px;max-width:100%;height:auto;border:0;"></a>
      </td></tr>
      <tr><td style="padding:8px 32px 30px;font:16px/1.6 ${SANS};color:${C.ink};">
        ${body}
      </td></tr>
      <tr><td style="padding:18px 32px 24px;border-top:1px solid ${C.line};font:13px/1.55 ${SANS};color:${C.muted};">
        ${footer}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font:12px ${SANS};color:${C.ink};">Driftler &middot; <a href="${esc(frontendUrl())}" style="color:${C.ink};">${esc(frontendUrl().replace(/^https?:\/\//, ''))}</a></p>
  </td></tr>
</table>
</body>
</html>`;
};

const h1 = (text) => `<h1 style="margin:14px 0 14px;font:400 32px/1.15 ${SERIF};letter-spacing:-0.5px;color:${C.ink};">${text}</h1>`;
const p = (text, extra = '') => `<p style="margin:0 0 14px;${extra}">${text}</p>`;

// --- Recuperar contraseña ---
export const resetPasswordEmail = ({ name, link, minutes = 60, logoUrl }) => {
  const body = [
    h1(`Crea una contraseña <em style="color:${C.tomato};">nueva</em>`),
    p(`Hola ${esc(name)},`),
    p(`Pediste cambiar tu contraseña de Driftler. El enlace vale por <strong>${esc(minutes === 60 ? '1 hora' : `${minutes} minutos`)}</strong> y se usa una sola vez.`),
    button(link, 'Crear contraseña nueva'),
    p(`Si el botón no funciona, copia y pega esta dirección en tu navegador:`, `margin-top:18px;font-size:13px;color:${C.muted};`),
    `<p style="margin:0;font:13px/1.5 ${MONO};word-break:break-all;color:${C.deep};">${esc(link)}</p>`,
  ].join('');
  const footer = `Si no fuiste tú, ignora este correo: tu contraseña no cambia. Por seguridad, nunca te pediremos tu contraseña por correo.<br>¿Dudas? Escríbenos a <a href="mailto:hello@driftler.com" style="color:${C.deep};">hello@driftler.com</a>.`;
  return layout({ preheader: 'El enlace para crear tu contraseña nueva vale por 1 hora.', title: 'Crea una contraseña nueva en Driftler', body, footer, logoUrl });
};

// --- Resumen diario para el admin ---
const chip = (text, bg, fg) =>
  `<span style="display:inline-block;padding:2px 9px;border-radius:99px;background:${bg};color:${fg};font:700 11px ${SANS};letter-spacing:.4px;text-transform:uppercase;">${esc(text)}</span>`;

const stat = (n, label) => `
  <td align="center" width="33%" style="width:33%;padding:14px 6px;background:#FFFFFF;border:2px solid ${C.ink};border-radius:10px;">
    <div style="font:400 34px/1 ${SERIF};color:${n ? C.tomato : C.ink};">${n}</div>
    <div style="margin-top:4px;font:12px ${SANS};color:${C.muted};">${esc(label)}</div>
  </td>`;

const section = (title, count, rowsHtml) => `
  <h2 style="margin:26px 0 8px;font:400 22px/1.2 ${SERIF};color:${C.ink};">${esc(title)} <span style="font:700 14px ${SANS};color:${C.muted};">(${count})</span></h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">${rowsHtml}</table>`;

const row = (inner) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line};font:15px/1.5 ${SANS};color:${C.ink};">${inner}</td></tr>`;

export const dailyDigestEmail = ({ reports, contacts, newRequests, dueSoon, panel, date, reasons, short, fmtDate, logoUrl }) => {
  const parts = [
    h1(`Novedades del <em style="color:${C.tomato};">día</em>`),
    p(`${esc(date)} &middot; esto es lo que llegó a Driftler desde el último resumen.`, `color:${C.muted};`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="8" border="0" style="margin:6px -8px 0;"><tr>
      ${stat(reports.length, 'reportes')}${stat(contacts.length, 'mensajes')}${stat(newRequests.length + dueSoon.length, 'eliminaciones')}
    </tr></table>`,
  ];

  if (reports.length) {
    parts.push(section('Reportes nuevos', reports.length, reports.map((r) =>
      row(`${chip(reasons[r.reason] || r.reason, C.yellow, C.ink)}<br><strong>${esc(short(r.post_title, 80))}</strong>${r.message ? `<br><span style="color:${C.muted};">${esc(short(r.message))}</span>` : ''}`)).join('')));
  }
  if (contacts.length) {
    parts.push(section('Mensajes de contacto', contacts.length, contacts.map((c) =>
      row(`<strong>${esc(short(c.name, 40))}</strong><br><span style="color:${C.muted};">${esc(short(c.message))}</span>`)).join('')));
  }
  if (newRequests.length) {
    parts.push(section('Solicitudes de eliminación nuevas', newRequests.length, newRequests.map((r) =>
      row(`Plazo hasta el <strong>${esc(fmtDate(r.due_at))}</strong>`)).join('')));
  }
  if (dueSoon.length) {
    parts.push(section('Eliminaciones por vencer o vencidas', dueSoon.length, dueSoon.map((r) =>
      row(`${chip('Urgente', C.tomato, C.cream)} &nbsp;Plazo: <strong>${esc(fmtDate(r.due_at))}</strong>`)).join('')));
  }
  parts.push(button(panel, 'Abrir el panel'));

  const footer = `Recibes este resumen porque eres administrador de Driftler. Se envía como máximo una vez al día y solo cuando hay novedades.`;
  const total = reports.length + contacts.length + newRequests.length + dueSoon.length;
  return layout({ preheader: `${total} novedad(es) pendientes en el panel de Driftler.`, title: 'Novedades de Driftler', body: parts.join(''), footer, logoUrl });
};
