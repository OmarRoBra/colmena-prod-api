import { and, eq, gte } from 'drizzle-orm';
import { db } from '../db';
import { notificaciones } from '../db/schema';
import { sendPushToUser } from './push-notification.service';
import logger from '../utils/logger';

export type NotificationDeliveryPayload = {
  titulo: string;
  mensaje: string;
  tipo: string;
  accionUrl?: string | null;
  dedupeHours?: number;
};

function startOfWindow(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export async function createNotification(
  usuarioId: string,
  condominioId: string | null,
  payload: NotificationDeliveryPayload
) {
  const [notification] = await db
    .insert(notificaciones)
    .values({
      usuarioId,
      condominioId,
      titulo: payload.titulo,
      mensaje: payload.mensaje,
      tipo: payload.tipo,
      accionUrl: payload.accionUrl ?? null,
    })
    .returning();

  void sendPushToUser(usuarioId, {
    title: payload.titulo,
    body: payload.mensaje,
    tipo: payload.tipo,
    url: payload.accionUrl ?? undefined,
  }).catch((error) => {
    logger.error('Push notification failed:', error);
  });

  return notification;
}

export async function createNotificationIfAbsent(
  usuarioId: string,
  condominioId: string | null,
  payload: NotificationDeliveryPayload
) {
  const dedupeHours = payload.dedupeHours ?? 24;
  const since = startOfWindow(dedupeHours);
  const existing = await db
    .select()
    .from(notificaciones)
    .where(
      and(
        eq(notificaciones.usuarioId, usuarioId),
        eq(notificaciones.titulo, payload.titulo),
        eq(notificaciones.tipo, payload.tipo),
        gte(notificaciones.createdAt, since)
      )
    );

  const duplicate = existing.find((item) => {
    if ((item.accionUrl || null) !== (payload.accionUrl || null)) {
      return false;
    }
    return item.mensaje === payload.mensaje;
  });

  if (duplicate) {
    return false;
  }

  await createNotification(usuarioId, condominioId, payload);
  return true;
}

export async function notifyUsers(
  userIds: string[],
  condominioId: string | null,
  payload: NotificationDeliveryPayload
) {
  let created = 0;
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  for (const userId of uniqueUserIds) {
    const inserted = await createNotificationIfAbsent(userId, condominioId, payload);
    if (inserted) created += 1;
  }

  return created;
}
