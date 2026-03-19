import { Message } from 'whatsapp-web.js';
import { eq, and, gte, lte, isNotNull, or } from 'drizzle-orm';
import { db } from '../db';
import { residentes, pagos, unidades, areasComunes, reservaciones, condominios } from '../db/schema';
import { whatsappService } from './whatsapp.service';
import logger from '../utils/logger';

// ─── Sesión conversacional en memoria ────────────────────────────────────────
// Guarda en qué "paso" está cada usuario durante la conversación
type BotStep =
  | 'menu'
  | 'areas_lista'
  | 'areas_disponibilidad'
  | 'pagos';

interface Session {
  step: BotStep;
  residenteId?: string;
  condominioId?: string;
  unidadId?: string;
  data?: Record<string, any>;
  updatedAt: Date;
}

const sessions = new Map<string, Session>();

// Expirar sesiones inactivas después de 15 minutos
const SESSION_TTL_MS = 15 * 60 * 1000;

function getSession(phone: string): Session {
  const session = sessions.get(phone);
  if (!session) return { step: 'menu', updatedAt: new Date() };

  const stale = Date.now() - session.updatedAt.getTime() > SESSION_TTL_MS;
  if (stale) {
    sessions.delete(phone);
    return { step: 'menu', updatedAt: new Date() };
  }

  return session;
}

function setSession(phone: string, session: Partial<Session>): void {
  const current = getSession(phone);
  sessions.set(phone, { ...current, ...session, updatedAt: new Date() });
}

function clearSession(phone: string): void {
  sessions.delete(phone);
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: string | number | null): string {
  const num = parseFloat(String(amount ?? 0));
  return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// Extrae solo los dígitos del número de WhatsApp (ej: "525512345678@c.us" → "5512345678")
function normalizePhone(chatId: string): string {
  const digits = chatId.replace('@c.us', '').replace(/\D/g, '');
  // Quitar código de país 52 si está presente para buscar en DB (10 dígitos)
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits.slice(2);
  }
  return digits;
}

// ─── Consultas DB ─────────────────────────────────────────────────────────────

async function findResidente(phone: string) {
  const tenDigit = phone.length === 12 && phone.startsWith('52') ? phone.slice(2) : phone;

  // Buscar por número de 10 dígitos o con código de país
  const [residente] = await db
    .select({
      id: residentes.id,
      nombre: residentes.nombre,
      condominioId: residentes.condominioId,
      unidadId: residentes.unidadId,
      activo: residentes.activo,
    })
    .from(residentes)
    .where(
      and(
        or(
          eq(residentes.telefono, tenDigit),
          eq(residentes.telefono, `52${tenDigit}`),
          eq(residentes.telefono, `+52${tenDigit}`)
        ),
        eq(residentes.activo, true)
      )
    )
    .limit(1);

  return residente ?? null;
}

async function getPagosPendientes(unidadId: string) {
  return db
    .select({
      id: pagos.id,
      concepto: pagos.concepto,
      monto: pagos.monto,
      estado: pagos.estado,
      metodoPago: pagos.metodoPago,
      fechaPago: pagos.fechaPago,
      createdAt: pagos.createdAt,
    })
    .from(pagos)
    .where(and(eq(pagos.unidadId, unidadId), eq(pagos.estado, 'pendiente')));
}

async function getAreasComunes(condominioId: string) {
  return db
    .select({
      id: areasComunes.id,
      nombre: areasComunes.nombre,
      tipo: areasComunes.tipo,
      capacidad: areasComunes.capacidad,
      costo: areasComunes.costo,
      horaApertura: areasComunes.horaApertura,
      horaCierre: areasComunes.horaCierre,
    })
    .from(areasComunes)
    .where(and(eq(areasComunes.condominioId, condominioId), eq(areasComunes.activo, true)));
}

async function getReservacionesArea(areaComunId: string, desde: Date, hasta: Date) {
  return db
    .select({
      fechaInicio: reservaciones.fechaInicio,
      fechaFin: reservaciones.fechaFin,
      estado: reservaciones.estado,
    })
    .from(reservaciones)
    .where(
      and(
        eq(reservaciones.areaComunId, areaComunId),
        gte(reservaciones.fechaInicio, desde),
        lte(reservaciones.fechaFin, hasta),
        or(eq(reservaciones.estado, 'pendiente'), eq(reservaciones.estado, 'confirmado'))
      )
    );
}

async function getMisReservaciones(unidadId: string) {
  const hoy = new Date();
  return db
    .select({
      area: reservaciones.area,
      fechaInicio: reservaciones.fechaInicio,
      fechaFin: reservaciones.fechaFin,
      estado: reservaciones.estado,
      costo: reservaciones.costo,
      pagado: reservaciones.pagado,
    })
    .from(reservaciones)
    .where(
      and(
        eq(reservaciones.unidadId, unidadId),
        gte(reservaciones.fechaInicio, hoy)
      )
    )
    .limit(5);
}

// ─── Generador de link de pago ────────────────────────────────────────────────

function buildPaymentLink(pagoId: string): string {
  const base = process.env.FRONTEND_URL ?? process.env.PAYMENT_URL ?? '';
  if (!base) return '(contacta a administración para pagar)';
  return `${base}/pagos/${pagoId}`;
}

// ─── Mensajes del bot ─────────────────────────────────────────────────────────

const MENU_MSG = (nombre: string) =>
  `¡Hola, *${nombre}*! 👋 Soy el asistente de tu condominio.\n\n` +
  `¿En qué te puedo ayudar?\n\n` +
  `1️⃣  Áreas comunes y disponibilidad\n` +
  `2️⃣  Mis pagos pendientes\n` +
  `3️⃣  Mis reservaciones\n\n` +
  `Responde con el *número* de la opción.`;

const UNKNOWN_MSG =
  `No entendí tu mensaje. Escribe *menu* para ver las opciones disponibles. 😊`;

const NOT_FOUND_MSG =
  `No encontré tu número en el sistema. Por favor contacta a la administración para registrar tu teléfono.`;

// ─── Manejadores de pasos ─────────────────────────────────────────────────────

async function handleMenu(
  msg: Message,
  phone: string,
  session: Session
): Promise<string> {
  const residente = await findResidente(phone);
  if (!residente) return NOT_FOUND_MSG;

  setSession(phone, {
    step: 'menu',
    residenteId: residente.id,
    condominioId: residente.condominioId,
    unidadId: residente.unidadId ?? undefined,
  });

  return MENU_MSG(residente.nombre);
}

async function handleOpcionMenu(
  opcion: string,
  phone: string,
  session: Session
): Promise<string> {
  switch (opcion) {
    case '1':
      return handleAreasComunes(phone, session);
    case '2':
      return handlePagosPendientes(phone, session);
    case '3':
      return handleMisReservaciones(phone, session);
    default:
      return UNKNOWN_MSG;
  }
}

async function handleAreasComunes(phone: string, session: Session): Promise<string> {
  if (!session.condominioId) return NOT_FOUND_MSG;

  const areas = await getAreasComunes(session.condominioId);
  if (areas.length === 0) {
    return 'No hay áreas comunes registradas en tu condominio. 🏢';
  }

  // Guardar las áreas en sesión para la siguiente selección
  setSession(phone, { step: 'areas_lista', data: { areas } });

  let msg = `🏊 *Áreas comunes disponibles*\n\n`;
  areas.forEach((area, i) => {
    msg += `*${i + 1}.* ${area.nombre} (${area.tipo})\n`;
    msg += `   ⏰ ${area.horaApertura} – ${area.horaCierre} | 👥 Cap. ${area.capacidad}\n`;
    msg += `   💰 ${formatCurrency(area.costo)}\n\n`;
  });

  msg += `Responde con el *número* del área para ver su disponibilidad en los próximos 7 días.\n`;
  msg += `O escribe *menu* para volver al inicio.`;
  return msg;
}

async function handleDisponibilidadArea(
  opcionStr: string,
  phone: string,
  session: Session
): Promise<string> {
  const areas: any[] = session.data?.areas ?? [];
  const idx = parseInt(opcionStr, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= areas.length) {
    return `Opción no válida. Responde con un número del 1 al ${areas.length} o escribe *menu*.`;
  }

  const area = areas[idx];
  const hoy = new Date();
  const en7dias = new Date(hoy);
  en7dias.setDate(en7dias.getDate() + 7);

  const reservas = await getReservacionesArea(area.id, hoy, en7dias);

  // Construir mapa de días ocupados
  const ocupados = new Set<string>();
  for (const r of reservas) {
    const d = new Date(r.fechaInicio);
    const fin = new Date(r.fechaFin);
    while (d <= fin) {
      ocupados.add(d.toDateString());
      d.setDate(d.getDate() + 1);
    }
  }

  let msg = `📅 *Disponibilidad — ${area.nombre}*\n`;
  msg += `⏰ Horario: ${area.horaApertura} a ${area.horaCierre}\n`;
  msg += `💰 Costo: ${formatCurrency(area.costo)}\n\n`;

  let hayDisponible = false;
  for (let i = 0; i < 7; i++) {
    const dia = new Date(hoy);
    dia.setDate(dia.getDate() + i);
    const libre = !ocupados.has(dia.toDateString());
    if (libre) hayDisponible = true;
    msg += libre
      ? `✅ ${formatDate(dia)}\n`
      : `❌ ${formatDate(dia)} — *Ocupado*\n`;
  }

  if (!hayDisponible) {
    msg += `\n😔 No hay días disponibles esta semana.`;
  } else {
    msg += `\n📲 Para hacer tu reservación ingresa al portal o contacta a la administración.`;
  }

  msg += `\n\nEscribe *menu* para volver al inicio.`;
  setSession(phone, { step: 'menu' });
  return msg;
}

async function handlePagosPendientes(phone: string, session: Session): Promise<string> {
  if (!session.unidadId) {
    return `No tengo tu unidad asociada. Contacta a la administración para vincular tu número. 🏠`;
  }

  const pendientes = await getPagosPendientes(session.unidadId);

  if (pendientes.length === 0) {
    return `✅ *¡Estás al corriente!*\n\nNo tienes pagos pendientes. 🎉\n\nEscribe *menu* para volver al inicio.`;
  }

  let total = 0;
  let msg = `💳 *Tus pagos pendientes*\n\n`;

  for (const p of pendientes) {
    const monto = parseFloat(p.monto ?? '0');
    total += monto;

    msg += `📋 *${p.concepto}*\n`;
    msg += `   💰 Monto: ${formatCurrency(monto)}\n`;
    msg += `   📅 Registrado: ${formatDate(new Date(p.createdAt))}\n`;
    msg += `   🔗 Link de pago: ${buildPaymentLink(p.id)}\n\n`;
  }

  msg += `─────────────────────\n`;
  msg += `*Total adeudado: ${formatCurrency(total)}*\n\n`;
  msg += `Escribe *menu* para volver al inicio.`;

  setSession(phone, { step: 'menu' });
  return msg;
}

async function handleMisReservaciones(phone: string, session: Session): Promise<string> {
  if (!session.unidadId) {
    return `No tengo tu unidad asociada. Contacta a la administración. 🏠`;
  }

  const proximas = await getMisReservaciones(session.unidadId);

  if (proximas.length === 0) {
    return `📅 No tienes reservaciones próximas.\n\nEscribe *1* para ver áreas disponibles o *menu* para volver.`;
  }

  let msg = `🗓️ *Tus próximas reservaciones*\n\n`;
  for (const r of proximas) {
    const estadoEmoji = r.estado === 'confirmado' ? '✅' : r.estado === 'pendiente' ? '⏳' : '❌';
    msg += `${estadoEmoji} *${r.area}*\n`;
    msg += `   📅 ${formatDate(new Date(r.fechaInicio))} → ${formatDate(new Date(r.fechaFin))}\n`;
    msg += `   💰 ${formatCurrency(r.costo)} — ${r.pagado ? 'Pagado ✅' : 'Sin pagar ⚠️'}\n\n`;
  }

  msg += `Escribe *menu* para volver al inicio.`;
  setSession(phone, { step: 'menu' });
  return msg;
}

// ─── Router principal de mensajes ─────────────────────────────────────────────

export async function handleBotMessage(msg: Message): Promise<void> {
  // Solo mensajes privados (no grupos)
  if (msg.from.endsWith('@g.us')) return;
  // Ignorar mensajes del propio bot
  if (msg.fromMe) return;

  const phone = normalizePhone(msg.from);
  const text = msg.body.trim().toLowerCase();
  const session = getSession(phone);

  let response: string;

  try {
    // Comandos globales que resetean el flujo
    if (['hola', 'menu', 'inicio', 'ayuda', 'help', '0'].includes(text)) {
      response = await handleMenu(msg, phone, session);
    } else if (session.step === 'menu' || !session.residenteId) {
      // Si el usuario no tiene sesión iniciada, iniciar con menú
      if (!session.residenteId) {
        response = await handleMenu(msg, phone, session);
        // Ahora que ya tenemos sesión, si mandó una opción del menú, procesarla
        const freshSession = getSession(phone);
        if (['1', '2', '3'].includes(text) && freshSession.residenteId) {
          response = await handleOpcionMenu(text, phone, freshSession);
        }
      } else {
        response = await handleOpcionMenu(text, phone, session);
      }
    } else if (session.step === 'areas_lista') {
      response = await handleDisponibilidadArea(text, phone, session);
    } else {
      response = UNKNOWN_MSG;
    }
  } catch (err: any) {
    logger.error(`WhatsApp bot error (${phone}): ${err.message}`);
    response = `Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo o escribe *menu*.`;
  }

  await msg.reply(response);
}

// ─── Inicialización del bot ───────────────────────────────────────────────────

export function initWhatsAppBot(client: any): void {
  client.on('message', async (msg: Message) => {
    try {
      await handleBotMessage(msg);
    } catch (err: any) {
      logger.error('WhatsApp bot unhandled error:', err.message);
    }
  });

  logger.info('WhatsApp bot iniciado y escuchando mensajes');
}
