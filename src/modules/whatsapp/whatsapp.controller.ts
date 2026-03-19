import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { residentes, pagos, unidades } from '../../db/schema';
import { whatsappService } from '../../services/whatsapp.service';
import logger from '../../utils/logger';

// GET /whatsapp/status
export async function getStatus(req: Request, res: Response): Promise<void> {
  res.json({
    status: whatsappService.getStatus(),
    serverless: whatsappService.isServerless,
  });
}

// GET /whatsapp/qr
export async function getQRCode(req: Request, res: Response): Promise<void> {
  if (whatsappService.isServerless) {
    res.status(503).json({ message: 'WhatsApp no está disponible en entorno serverless' });
    return;
  }

  const qr = await whatsappService.getQRCode();
  if (!qr) {
    res.status(404).json({
      message: 'No hay QR disponible. El cliente puede estar ya autenticado o aún no inicializado.',
      status: whatsappService.getStatus(),
    });
    return;
  }

  res.json({ qr });
}

// POST /whatsapp/send
export async function sendMensaje(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { telefono, mensaje } = req.body;

  try {
    await whatsappService.sendMessage(telefono, mensaje);
  } catch (err: any) {
    const status = whatsappService.getStatus();
    if (status !== 'ready') {
      res.status(503).json({
        message: `Cliente de WhatsApp no disponible. Estado actual: ${status}. Escanea el QR en /whatsapp-setup.`,
        status,
      });
      return;
    }
    if (err?.code === 'NOT_ON_WHATSAPP') {
      res.status(400).json({ message: err.message });
      return;
    }
    throw err;
  }

  logger.info(`WhatsApp: mensaje enviado a ${telefono}`);
  res.json({ message: 'Mensaje enviado correctamente' });
}

// POST /whatsapp/avisos/condominio/:condominioId
export async function enviarAvisoCondominio(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { condominioId } = req.params;
  const { asunto, mensaje } = req.body;

  const destinatarios = await db
    .select({ nombre: residentes.nombre, telefono: residentes.telefono, telefonoWhatsapp: residentes.telefonoWhatsapp })
    .from(residentes)
    .where(
      and(
        eq(residentes.condominioId, condominioId),
        eq(residentes.activo, true),
        isNotNull(residentes.telefono)
      )
    );

  if (destinatarios.length === 0) {
    res.json({ message: 'No hay residentes activos con teléfono registrado', sent: 0, failed: 0, total: 0 });
    return;
  }

  const texto = asunto ? `*${asunto}*\n\n${mensaje}` : mensaje;

  let result: { sent: number; failed: number };
  try {
    result = await whatsappService.sendBulkMessages(
      destinatarios.map((r) => ({ nombre: r.nombre, telefono: r.telefonoWhatsapp || r.telefono! })),
      texto
    );
  } catch (err: any) {
    const status = whatsappService.getStatus();
    if (status !== 'ready') {
      res.status(503).json({
        message: `Cliente de WhatsApp no disponible. Estado actual: ${status}. Escanea el QR en /whatsapp-setup.`,
        status,
      });
      return;
    }
    throw err;
  }

  logger.info(`WhatsApp: aviso enviado a ${result.sent}/${destinatarios.length} residentes (condominio ${condominioId})`);
  res.json({ ...result, total: destinatarios.length });
}

// POST /whatsapp/pagos/recordatorio/:condominioId
export async function enviarRecordatorioPagos(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { condominioId } = req.params;
  const { mensaje: mensajePersonalizado } = req.body;

  // pagos pendientes → join unidades para filtrar por condominio → join usuarios → join residentes para teléfono
  const pendientes = await db
    .select({
      nombre: residentes.nombre,
      telefono: residentes.telefono,
      monto: pagos.monto,
      concepto: pagos.concepto,
      createdAt: pagos.createdAt,
    })
    .from(pagos)
    .innerJoin(unidades, eq(pagos.unidadId, unidades.id))
    .innerJoin(residentes, and(eq(residentes.unidadId, unidades.id), eq(residentes.activo, true)))
    .where(
      and(
        eq(unidades.condominiumId, condominioId),
        eq(pagos.estado, 'pendiente'),
        isNotNull(residentes.telefono)
      )
    );

  if (pendientes.length === 0) {
    res.json({ message: 'No hay pagos pendientes con teléfono de residente registrado', sent: 0, failed: 0, total: 0 });
    return;
  }

  const result = await whatsappService.sendBulkMessages(
    pendientes.map((p) => ({ nombre: p.nombre, telefono: p.telefono! })),
    (nombre) => {
      const info = pendientes.find((p) => p.nombre === nombre);

      if (mensajePersonalizado) {
        return mensajePersonalizado
          .replace('{nombre}', nombre)
          .replace('{monto}', info?.monto ?? '0.00')
          .replace('{concepto}', info?.concepto ?? 'Cuota de mantenimiento');
      }

      return (
        `Estimado/a *${nombre}*, le recordamos que tiene un pago pendiente:\n\n` +
        `📋 Concepto: ${info?.concepto ?? 'Cuota de mantenimiento'}\n` +
        `💰 Monto: $${info?.monto ?? '0.00'}\n\n` +
        `Por favor regularice su situación a la brevedad.\n¡Gracias por su atención!`
      );
    }
  );

  logger.info(`WhatsApp: recordatorio enviado a ${result.sent}/${pendientes.length} residentes (condominio ${condominioId})`);
  res.json({ ...result, total: pendientes.length });
}
