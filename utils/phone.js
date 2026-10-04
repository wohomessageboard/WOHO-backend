// Teléfono de contacto = WhatsApp. Se guarda en formato internacional: "+" y solo dígitos
// (p. ej. +56912345678), porque wa.me exige el número con código de país.
//
// Acepta lo que la gente suele escribir: "+56 9 1234 5678", "(+56) 9-1234-5678",
// "0056912345678". Un número SIN código de país ("9 1234 5678") se rechaza: no hay
// forma segura de adivinar el país.
export const normalizePhone = (value) => {
  if (value === undefined || value === null) return null;
  let raw = String(value).trim();
  if (!raw) return null;

  raw = raw.replace(/[\s().-]/g, '');
  if (raw.startsWith('00')) raw = '+' + raw.slice(2);
  if (!/^\+\d{8,15}$/.test(raw)) return null;
  if (raw[1] === '0') return null; // los códigos de país no empiezan en 0
  return raw;
};

export const PHONE_HELP = 'Escribe tu WhatsApp con código de país, por ejemplo +56 9 1234 5678.';
