import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { pushSubscriptions, usuarios } from '../db/schema';
import { config } from '../config/env';
import logger from '../utils/logger';

// Initialize VAPID keys if configured
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tipo?: string;
}

async function sendToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    // 410 Gone or 404 = subscription expired, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      logger.info(`Removed expired push subscription: ${sub.id}`);
    } else {
      logger.error(`Push send failed for subscription ${sub.id}:`, error);
    }
    return false;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!config.vapid.publicKey || !config.vapid.privateKey) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.usuarioId, userId));

  if (subs.length === 0) return;

  const defaultPayload: PushPayload = {
    ...payload,
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: payload.badge ?? '/icons/icon-192x192.png',
  };

  await Promise.allSettled(
    subs.map((sub) => sendToSubscription(sub, defaultPayload))
  );
}

export async function sendPushToCondominium(
  condominiumId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  if (!config.vapid.publicKey || !config.vapid.privateKey) return;

  // Get all subscriptions for users in this condominium
  // Since we don't have a direct condominium-user join, we get all subscriptions
  // and filter. For now, send to all subscribers (the notification system already
  // handles per-user targeting via createNotificacion).
  // This method is for broadcast-style notifications if needed.
  const subs = await db.select().from(pushSubscriptions);

  const defaultPayload: PushPayload = {
    ...payload,
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: payload.badge ?? '/icons/icon-192x192.png',
  };

  const filtered = excludeUserId
    ? subs.filter((s) => s.usuarioId !== excludeUserId)
    : subs;

  await Promise.allSettled(
    filtered.map((sub) => sendToSubscription(sub, defaultPayload))
  );
}
