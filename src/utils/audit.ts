import { db } from '../db';
import { auditLogs } from '../db/schema';
import logger from './logger';

interface AuditParams {
  usuarioId?: string | null;
  condominioId?: string | null;
  accion: string;      // create | update | delete
  entidad: string;     // pago | residente | unidad | mantenimiento | cargador | etc.
  entidadId?: string | null;
  detalles?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      usuarioId: params.usuarioId ?? null,
      condominioId: params.condominioId ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId ?? null,
      detalles: params.detalles ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    // Audit failures should never break the main flow
    logger.error('Failed to write audit log:', err);
  }
}
