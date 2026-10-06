import { esc, resetPasswordEmail, dailyDigestEmail } from '../services/emailTemplates.js';

const base = { reasons: { spam: 'Spam' }, short: (s) => String(s ?? ''), fmtDate: () => '1/1/2027', panel: 'https://driftler.com/admin-dashboard' };

describe('Correos HTML', () => {
  it('esc neutraliza HTML', () => {
    expect(esc('<img src=x onerror="a()">&\'')).toBe('&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
  });

  it('recuperar contraseña: incluye el enlace, el botón y escapa el nombre', () => {
    const html = resetPasswordEmail({ name: '<script>alert(1)</script>', link: 'https://driftler.com/restablecer?token=abc' });
    expect(html).toContain('href="https://driftler.com/restablecer?token=abc"');
    expect(html).toContain('Crear contraseña nueva');
    expect(html).not.toContain('<script>');
  });

  it('resumen diario: escapa lo que escriben las personas usuarias', () => {
    const html = dailyDigestEmail({
      ...base,
      reports: [{ reason: 'spam', post_title: '<b>Oferta</b>', message: '<script>x</script>' }],
      contacts: [{ name: '"><img src=x>', message: 'hola' }],
      newRequests: [], dueSoon: [], date: 'hoy',
    });
    expect(html).toContain('&lt;b&gt;Oferta&lt;/b&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('Abrir el panel');
  });

  it('resumen diario: solo muestra las secciones con novedades', () => {
    const html = dailyDigestEmail({ ...base, reports: [], contacts: [{ name: 'Ana', message: 'hola' }], newRequests: [], dueSoon: [], date: 'hoy' });
    expect(html).toContain('Mensajes de contacto');
    expect(html).not.toContain('Reportes nuevos');
  });
});
