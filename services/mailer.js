// Envío de correo con Resend (https://resend.com), sin SDK: una sola llamada HTTP.
//
// Variables de entorno:
//   RESEND_API_KEY   llave de Resend. Si falta, NO se envía nada: en desarrollo el correo
//                    se imprime en la consola (así se prueba el flujo sin cuenta); en
//                    producción se registra un aviso.
//   MAIL_FROM        remitente verificado en Resend, p. ej. "Driftler <no-responder@tudominio.com>".
//                    Para probar sin dominio propio sirve "Driftler <onboarding@resend.dev>"
//                    (Resend solo entrega a tu propio correo en ese modo).
//
// Para no gastar el cupo, el correo se usa solo en dos casos: recuperar contraseña y el
// resumen diario al admin.
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, text, html }) => {
  const from = process.env.MAIL_FROM || 'Driftler <onboarding@resend.dev>';

  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[mail] RESEND_API_KEY no está configurada: no se envió "${subject}" a ${to}.`);
    } else if (process.env.NODE_ENV !== 'test') {
      console.log(`\n[mail simulado] Para: ${to}\nAsunto: ${subject}\n${text}\n`);
    }
    return { simulated: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
};
