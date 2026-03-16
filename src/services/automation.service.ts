import { and, eq, inArray, isNotNull, isNull, like, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  automationRuns,
  contratos,
  mantenimiento,
  pagos,
  proveedores,
  reglamentos,
  residentes,
  reservaciones,
  trabajadores,
  unidades,
  usuarios,
  visitas,
  condominios,
  familiares,
  residenteChecklists,
} from '../db/schema';
import logger from '../utils/logger';
import { notifyUsers, type NotificationDeliveryPayload } from './notification-delivery.service';

type NotificationPayload = NotificationDeliveryPayload;

export type AutomationRunSummary = {
  monthlyFeesGenerated: number;
  notificationsCreated: number;
  residentAccessDisabled: number;
  contractsExpired: number;
  contractReminders: number;
  maintenanceEscalations: number;
  paymentOverdues: number;
  paymentReminders: number;
  moraCalculations: number;
  providerSuspensions: number;
  providerReminders: number;
  visitReminders: number;
  staleVisitAlerts: number;
  reservationReminders: number;
};

const DEFAULT_SUMMARY = (): AutomationRunSummary => ({
  monthlyFeesGenerated: 0,
  notificationsCreated: 0,
  residentAccessDisabled: 0,
  contractsExpired: 0,
  contractReminders: 0,
  maintenanceEscalations: 0,
  paymentOverdues: 0,
  paymentReminders: 0,
  moraCalculations: 0,
  providerSuspensions: 0,
  providerReminders: 0,
  visitReminders: 0,
  staleVisitAlerts: 0,
  reservationReminders: 0,
});

let schedulerHandle: NodeJS.Timeout | null = null;
let schedulerRunning = false;

const AUTOMATION_INTERVAL_MS = Math.max(
  Number(process.env.AUTOMATION_INTERVAL_MINUTES || '30'),
  5
) * 60 * 1000;

const AUTOMATIONS_ENABLED = process.env.AUTOMATIONS_ENABLED !== 'false';

function mergeSummary(target: AutomationRunSummary, next: AutomationRunSummary) {
  target.monthlyFeesGenerated += next.monthlyFeesGenerated;
  target.notificationsCreated += next.notificationsCreated;
  target.residentAccessDisabled += next.residentAccessDisabled;
  target.contractsExpired += next.contractsExpired;
  target.contractReminders += next.contractReminders;
  target.maintenanceEscalations += next.maintenanceEscalations;
  target.paymentOverdues += next.paymentOverdues;
  target.paymentReminders += next.paymentReminders;
  target.moraCalculations += next.moraCalculations;
  target.providerSuspensions += next.providerSuspensions;
  target.providerReminders += next.providerReminders;
  target.visitReminders += next.visitReminders;
  target.staleVisitAlerts += next.staleVisitAlerts;
  target.reservationReminders += next.reservationReminders;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function getPaymentDueDate(payment: typeof pagos.$inferSelect) {
  return normalizeDate(payment.fechaLimite) || normalizeDate(payment.createdAt);
}

function resolveMonthlyDueDate(anio: number, mes: number, diaVencimiento?: number) {
  const lastDay = new Date(anio, mes, 0).getDate();
  const day = Math.min(Math.max(diaVencimiento || 10, 1), lastDay);
  return new Date(anio, mes - 1, day, 12, 0, 0, 0);
}

type AutomationSettings = {
  monthlyFeeGenerationDay: number;
  monthlyFeeDueDay: number;
  paymentReminderDays: number;
  contractReminderDays: number;
  providerReminderDays: number;
  maintenancePendingHighHours: number;
  maintenanceInProgressDays: number;
  visitReminderHours: number;
  staleVisitHours: number;
  moraPorcentaje: number;        // Monthly late-fee percentage (e.g. 5 = 5%)
  moraGraceDays: number;         // Grace period after due date before mora kicks in
};

const DEFAULT_SETTINGS: AutomationSettings = {
  monthlyFeeGenerationDay: 1,
  monthlyFeeDueDay: 10,
  paymentReminderDays: 3,
  contractReminderDays: 30,
  providerReminderDays: 21,
  maintenancePendingHighHours: 8,
  maintenanceInProgressDays: 3,
  visitReminderHours: 3,
  staleVisitHours: 12,
  moraPorcentaje: 5,
  moraGraceDays: 5,
};

async function getAutomationSettings(condominioId: string): Promise<AutomationSettings> {
  const [condo] = await db
    .select({ configuracion: condominios.configuracion })
    .from(condominios)
    .where(eq(condominios.id, condominioId))
    .limit(1);

  const config = (condo?.configuracion || {}) as Record<string, unknown>;
  const automation = (config.automation || {}) as Record<string, unknown>;

  const readNumber = (key: keyof AutomationSettings) => {
    const value = automation[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : DEFAULT_SETTINGS[key];
  };

  return {
    monthlyFeeGenerationDay: readNumber('monthlyFeeGenerationDay'),
    monthlyFeeDueDay: readNumber('monthlyFeeDueDay'),
    paymentReminderDays: readNumber('paymentReminderDays'),
    contractReminderDays: readNumber('contractReminderDays'),
    providerReminderDays: readNumber('providerReminderDays'),
    maintenancePendingHighHours: readNumber('maintenancePendingHighHours'),
    maintenanceInProgressDays: readNumber('maintenanceInProgressDays'),
    visitReminderHours: readNumber('visitReminderHours'),
    staleVisitHours: readNumber('staleVisitHours'),
    moraPorcentaje: readNumber('moraPorcentaje'),
    moraGraceDays: readNumber('moraGraceDays'),
  };
}

async function getManagerUserIds(condominioId: string) {
  const [condo] = await db
    .select({ gerenteId: condominios.gerenteId })
    .from(condominios)
    .where(eq(condominios.id, condominioId))
    .limit(1);

  const adminUsers = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(or(eq(usuarios.rol, 'admin'), eq(usuarios.rol, 'condoAdmin')));

  const ids = adminUsers.map((user) => user.id);
  if (condo?.gerenteId) ids.push(condo.gerenteId);
  return [...new Set(ids)];
}

async function getAutomationActorUserId(condominioId: string) {
  const managerIds = await getManagerUserIds(condominioId);
  return managerIds[0] || null;
}

async function getResidentUserIds(condominioId: string) {
  const condoResidents = await db
    .select({ usuarioId: residentes.usuarioId })
    .from(residentes)
    .where(
      and(
        eq(residentes.condominioId, condominioId),
        eq(residentes.activo, true),
        isNotNull(residentes.usuarioId)
      )
    );

  return condoResidents
    .map((resident) => resident.usuarioId)
    .filter((value): value is string => Boolean(value));
}

async function getSecurityUserIds(condominioId: string) {
  const securityWorkers = await db
    .select({ usuarioId: trabajadores.usuarioId })
    .from(trabajadores)
    .where(
      and(
        eq(trabajadores.condominioId, condominioId),
        eq(trabajadores.activo, true),
        eq(trabajadores.puesto, 'seguridad'),
        isNotNull(trabajadores.usuarioId)
      )
    );

  return securityWorkers
    .map((worker) => worker.usuarioId)
    .filter((value): value is string => Boolean(value));
}

async function getResidentUserIdsByUnitIds(unitIds: string[]) {
  if (unitIds.length === 0) return new Map<string, string[]>();

  const condoResidents = await db
    .select({ unidadId: residentes.unidadId, usuarioId: residentes.usuarioId })
    .from(residentes)
    .where(
      and(
        inArray(residentes.unidadId, unitIds),
        eq(residentes.activo, true),
        isNotNull(residentes.usuarioId)
      )
    );

  const map = new Map<string, string[]>();
  for (const item of condoResidents) {
    if (!item.unidadId || !item.usuarioId) continue;
    const list = map.get(item.unidadId) || [];
    list.push(item.usuarioId);
    map.set(item.unidadId, list);
  }

  return map;
}

export async function notifyMonthlyFeesGenerated(
  condominioId: string,
  generatedPayments: Array<typeof pagos.$inferSelect>
) {
  const summary = DEFAULT_SUMMARY();
  if (generatedPayments.length === 0) return summary;

  const managerIds = await getManagerUserIds(condominioId);
  summary.notificationsCreated += await notifyUsers(managerIds, condominioId, {
    titulo: 'Cuotas de mantenimiento generadas',
    mensaje: `Se generaron ${generatedPayments.length} cuotas de mantenimiento para el condominio.`,
    tipo: 'pago',
    accionUrl: '/pagos',
    dedupeHours: 2,
  });

  const residentMap = await getResidentUserIdsByUnitIds(
    generatedPayments.map((payment) => payment.unidadId)
  );

  for (const payment of generatedPayments) {
    const unitUsers = residentMap.get(payment.unidadId) || [];
    summary.notificationsCreated += await notifyUsers(unitUsers, condominioId, {
      titulo: 'Nueva cuota disponible',
      mensaje: `Se generó un nuevo cargo: ${payment.concepto}.`,
      tipo: 'pago',
      accionUrl: '/portal/pagos',
      dedupeHours: 6,
    });
  }

  return summary;
}

async function processMonthlyMaintenanceFees(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();
  const condos = condominioId
    ? await db.select().from(condominios).where(eq(condominios.id, condominioId))
    : await db.select().from(condominios).where(eq(condominios.activo, true));

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  for (const condo of condos) {
    const settings = await getAutomationSettings(condo.id);
    const currentDay = now.getDate();

    if (currentDay < settings.monthlyFeeGenerationDay) {
      continue;
    }

    const actorUserId = await getAutomationActorUserId(condo.id);
    if (!actorUserId) {
      logger.warn('Skipping automatic monthly fee generation because no actor user is available', {
        condominioId: condo.id,
      });
      continue;
    }

    const condoUnidades = await db
      .select()
      .from(unidades)
      .where(eq(unidades.condominiumId, condo.id));

    if (condoUnidades.length === 0) continue;

    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();
    const monthName = monthNames[mes - 1] || `Mes ${mes}`;
    const conceptoPrefix = `Cuota Mantenimiento ${monthName} ${anio}`;
    const dueDate = resolveMonthlyDueDate(anio, mes, settings.monthlyFeeDueDay);
    const createdPagos: Array<typeof pagos.$inferSelect> = [];

    for (const unidad of condoUnidades) {
      if (unidad.estado === 'Vacío' || unidad.estado === 'Mantenimiento') {
        continue;
      }

      const [existing] = await db
        .select({ id: pagos.id })
        .from(pagos)
        .where(
          and(
            eq(pagos.unidadId, unidad.id),
            like(pagos.concepto, `${conceptoPrefix}%`)
          )
        )
        .limit(1);

      if (existing) {
        continue;
      }

      const refLabel = unidad.referenciaUnica ? ` [Ref: ${unidad.referenciaUnica}]` : '';
      const concepto = `${conceptoPrefix} - Unidad ${unidad.numero}${refLabel}`;

      const [newPago] = await db
        .insert(pagos)
        .values({
          unidadId: unidad.id,
          usuarioId: actorUserId,
          monto: unidad.cuotaMantenimiento,
          concepto,
          metodoPago: 'pendiente',
          referencia: unidad.referenciaUnica || undefined,
          estado: 'pendiente',
          fechaLimite: dueDate,
        })
        .returning();

      createdPagos.push(newPago);
    }

    if (createdPagos.length > 0) {
      summary.monthlyFeesGenerated += createdPagos.length;
      mergeSummary(summary, await notifyMonthlyFeesGenerated(condo.id, createdPagos));
    }
  }

  return summary;
}

export async function notifyPaymentReported(payment: typeof pagos.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const [unit] = await db
    .select({ condominiumId: unidades.condominiumId, numero: unidades.numero })
    .from(unidades)
    .where(eq(unidades.id, payment.unidadId))
    .limit(1);

  if (!unit) return summary;

  const managerIds = await getManagerUserIds(unit.condominiumId);
  summary.notificationsCreated += await notifyUsers(managerIds, unit.condominiumId, {
    titulo: 'Pago reportado por residente',
    mensaje: `La unidad ${unit.numero} reportó un pago por verificar: ${payment.concepto}.`,
    tipo: 'pago',
    accionUrl: '/pagos',
    dedupeHours: 4,
  });

  return summary;
}

export async function notifyPaymentApproved(payment: typeof pagos.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const [unit] = await db
    .select({ condominiumId: unidades.condominiumId, numero: unidades.numero })
    .from(unidades)
    .where(eq(unidades.id, payment.unidadId))
    .limit(1);

  if (!unit) return summary;

  const residentMap = await getResidentUserIdsByUnitIds([payment.unidadId]);
  const residentIds = residentMap.get(payment.unidadId) ?? [];

  summary.notificationsCreated += await notifyUsers(residentIds, unit.condominiumId, {
    titulo: 'Pago aprobado',
    mensaje: `Tu pago "${payment.concepto}" ha sido aprobado.`,
    tipo: 'pago',
    accionUrl: '/portal/pagos',
    dedupeHours: 1,
  });

  return summary;
}

export async function notifyPaymentRejected(payment: typeof pagos.$inferSelect, motivoRechazo?: string) {
  const summary = DEFAULT_SUMMARY();
  const [unit] = await db
    .select({ condominiumId: unidades.condominiumId, numero: unidades.numero })
    .from(unidades)
    .where(eq(unidades.id, payment.unidadId))
    .limit(1);

  if (!unit) return summary;

  const residentMap = await getResidentUserIdsByUnitIds([payment.unidadId]);
  const residentIds = residentMap.get(payment.unidadId) ?? [];

  const reason = motivoRechazo ? ` Motivo: ${motivoRechazo}` : '';
  summary.notificationsCreated += await notifyUsers(residentIds, unit.condominiumId, {
    titulo: 'Pago rechazado',
    mensaje: `Tu pago "${payment.concepto}" fue rechazado.${reason}`,
    tipo: 'pago',
    accionUrl: '/portal/pagos',
    dedupeHours: 1,
  });

  return summary;
}

export async function notifyResidentOnboarding(
  resident: typeof residentes.$inferSelect & { usuarioId?: string | null },
  credentialsSent: boolean
) {
  const summary = DEFAULT_SUMMARY();
  if (!resident.usuarioId) return summary;

  summary.notificationsCreated += await notifyUsers([resident.usuarioId], resident.condominioId, {
    titulo: 'Bienvenido al portal del condominio',
    mensaje: credentialsSent
      ? 'Tu acceso fue creado correctamente. Ya puedes consultar pagos, visitas, reglamento y comunicaciones.'
      : 'Tu perfil fue creado. La administración te compartirá el acceso al portal.',
    tipo: 'info',
    accionUrl: '/portal',
    dedupeHours: 72,
  });

  return summary;
}

async function syncUnitOccupancy(unitId: string | null | undefined) {
  if (!unitId) return;

  const [unit] = await db
    .select()
    .from(unidades)
    .where(eq(unidades.id, unitId))
    .limit(1);

  if (!unit) return;

  const activeResidents = await db
    .select({ id: residentes.id })
    .from(residentes)
    .where(
      and(
        eq(residentes.unidadId, unitId),
        eq(residentes.activo, true)
      )
    );

  const desiredState = activeResidents.length > 0 ? 'Ocupado' : 'Vacío';
  if (unit.estado !== desiredState) {
    await db
      .update(unidades)
      .set({ estado: desiredState, updatedAt: new Date() })
      .where(eq(unidades.id, unitId));
  }
}

async function setUserAccess(usuarioId: string | null | undefined, activo: boolean) {
  if (!usuarioId) return false;

  const [existing] = await db
    .select({ id: usuarios.id, activo: usuarios.activo })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!existing || existing.activo === activo) return false;

  await db
    .update(usuarios)
    .set({
      activo,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, usuarioId));

  return true;
}

async function closeResidentVisits(residenteId: string) {
  await db
    .update(visitas)
    .set({
      estado: 'salida',
      salidaAt: new Date(),
    })
    .where(
      and(
        eq(visitas.residenteId, residenteId),
        or(eq(visitas.estado, 'pendiente'), eq(visitas.estado, 'llegada'))
      )
    );
}

async function countResidentFamilyMembers(residenteId: string) {
  const rows = await db
    .select({ id: familiares.id })
    .from(familiares)
    .where(eq(familiares.residenteId, residenteId));
  return rows.length;
}

async function countOpenVisits(residenteId: string) {
  const rows = await db
    .select({ id: visitas.id })
    .from(visitas)
    .where(
      and(
        eq(visitas.residenteId, residenteId),
        or(eq(visitas.estado, 'pendiente'), eq(visitas.estado, 'llegada'))
      )
    );
  return rows.length;
}

type ChecklistTemplate = {
  tipo: 'onboarding' | 'offboarding';
  titulo: string;
  descripcion: string;
  dueDays: number;
  metadata?: Record<string, unknown>;
};

const ONBOARDING_TEMPLATES: ChecklistTemplate[] = [
  {
    tipo: 'onboarding',
    titulo: 'Confirmar documentos del residente',
    descripcion: 'Validar identificación, contacto de emergencia y datos del expediente.',
    dueDays: 2,
    metadata: { category: 'documents' },
  },
  {
    tipo: 'onboarding',
    titulo: 'Entregar acceso y reglamento',
    descripcion: 'Confirmar que el residente recibió acceso al portal y reglamento vigente.',
    dueDays: 2,
    metadata: { category: 'access' },
  },
  {
    tipo: 'onboarding',
    titulo: 'Verificar configuración de cobro',
    descripcion: 'Corroborar que la unidad tenga cuota y calendario de cobro correcto.',
    dueDays: 5,
    metadata: { category: 'billing' },
  },
];

const OFFBOARDING_TEMPLATES: ChecklistTemplate[] = [
  {
    tipo: 'offboarding',
    titulo: 'Revisar accesos y visitas abiertas',
    descripcion: 'Confirmar cierre de visitas, accesos asociados y familiares vinculados.',
    dueDays: 1,
    metadata: { category: 'security' },
  },
  {
    tipo: 'offboarding',
    titulo: 'Validar adeudos y saldo final',
    descripcion: 'Revisar pagos pendientes y definir seguimiento administrativo si aplica.',
    dueDays: 3,
    metadata: { category: 'billing' },
  },
  {
    tipo: 'offboarding',
    titulo: 'Actualizar ocupación de la unidad',
    descripcion: 'Confirmar estado final de la unidad y disponibilidad para nuevo residente.',
    dueDays: 2,
    metadata: { category: 'occupancy' },
  },
];

async function ensureChecklistTasks(
  resident: typeof residentes.$inferSelect,
  templates: ChecklistTemplate[]
) {
  for (const template of templates) {
    const existing = await db
      .select({ id: residenteChecklists.id })
      .from(residenteChecklists)
      .where(
        and(
          eq(residenteChecklists.residenteId, resident.id),
          eq(residenteChecklists.tipo, template.tipo),
          eq(residenteChecklists.titulo, template.titulo),
          eq(residenteChecklists.estado, 'pendiente')
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(residenteChecklists).values({
      condominioId: resident.condominioId,
      residenteId: resident.id,
      tipo: template.tipo,
      titulo: template.titulo,
      descripcion: template.descripcion,
      estado: 'pendiente',
      dueAt: addDays(new Date(), template.dueDays),
      metadata: template.metadata ?? null,
    });
  }
}

async function cancelChecklistTasks(
  residenteId: string,
  tipo: 'onboarding' | 'offboarding'
) {
  await db
    .update(residenteChecklists)
    .set({
      estado: 'cancelado',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(residenteChecklists.residenteId, residenteId),
        eq(residenteChecklists.tipo, tipo),
        eq(residenteChecklists.estado, 'pendiente')
      )
    );
}

export async function handleResidentLifecycle(
  current: typeof residentes.$inferSelect,
  previous?: typeof residentes.$inferSelect | null,
  options?: { deleted?: boolean }
) {
  const summary = DEFAULT_SUMMARY();

  const previousUnitId = previous?.unidadId || null;
  const currentUnitId = options?.deleted ? null : current.unidadId || null;
  const becameInactive = previous ? previous.activo && !current.activo : false;
  const movedOut = !!previous && !!previousUnitId && previousUnitId !== currentUnitId;
  const movedIn = !!currentUnitId && (!previous || previousUnitId !== currentUnitId);
  const familyCount = becameInactive || options?.deleted ? await countResidentFamilyMembers(current.id) : 0;
  const openVisitCount = movedOut || becameInactive || options?.deleted ? await countOpenVisits(current.id) : 0;

  if (movedOut || becameInactive || options?.deleted) {
    await closeResidentVisits(current.id);
  }

  await syncUnitOccupancy(previousUnitId);
  await syncUnitOccupancy(currentUnitId);

  const managerIds = await getManagerUserIds(current.condominioId);

  if (movedOut) {
    summary.notificationsCreated += await notifyUsers(managerIds, current.condominioId, {
      titulo: 'Residente reasignado de unidad',
      mensaje: `${current.nombre} fue desasignado de su unidad anterior.`,
      tipo: 'info',
      accionUrl: '/residentes',
      dedupeHours: 4,
    });
  }

  if (movedIn) {
    const reenabled = await setUserAccess(current.usuarioId, true);
    void reenabled;

    await cancelChecklistTasks(current.id, 'offboarding');
    await ensureChecklistTasks(current, ONBOARDING_TEMPLATES);

    summary.notificationsCreated += await notifyUsers(managerIds, current.condominioId, {
      titulo: 'Nuevo movimiento de ocupación',
      mensaje: `${current.nombre} fue asignado a una unidad.`,
      tipo: 'info',
      accionUrl: '/residentes',
      dedupeHours: 4,
    });

    if (current.usuarioId) {
      summary.notificationsCreated += await notifyUsers([current.usuarioId], current.condominioId, {
        titulo: 'Unidad asignada',
        mensaje: 'Tu perfil ya fue vinculado a una unidad del condominio. Ya puedes ver pagos, visitas y reglamento desde el portal.',
        tipo: 'info',
        accionUrl: '/portal/mi-unidad',
        dedupeHours: 6,
      });
    }
  }

  if (becameInactive || options?.deleted) {
    const disabled = await setUserAccess(current.usuarioId, false);
    if (disabled) {
      summary.residentAccessDisabled += 1;
    }

    await cancelChecklistTasks(current.id, 'onboarding');
    await ensureChecklistTasks(
      current,
      OFFBOARDING_TEMPLATES.map((template) => ({
        ...template,
        metadata:
          template.metadata?.category === 'security'
            ? {
                ...template.metadata,
                familyCount,
                openVisitCount,
              }
            : template.metadata,
        descripcion:
          template.metadata?.category === 'security'
            ? `Confirmar cierre de visitas abiertas (${openVisitCount}) y revisar familiares vinculados (${familyCount}).`
            : template.descripcion,
      }))
    );

    summary.notificationsCreated += await notifyUsers(managerIds, current.condominioId, {
      titulo: options?.deleted ? 'Residente eliminado' : 'Residente dado de baja',
      mensaje:
        familyCount > 0
          ? `${current.nombre} salió del condominio. Revisa familiares y accesos asociados.`
          : `${current.nombre} salió del condominio y sus visitas abiertas fueron cerradas.`,
      tipo: 'info',
      accionUrl: '/residentes',
      dedupeHours: 4,
    });
  }

  return summary;
}

export async function notifyReglamentoPublished(reglamento: typeof reglamentos.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  if (reglamento.estado !== 'active') return summary;

  const residentIds = await getResidentUserIds(reglamento.condominioId);
  summary.notificationsCreated += await notifyUsers(residentIds, reglamento.condominioId, {
    titulo: 'Nuevo reglamento vigente',
    mensaje: `Se publicó la versión ${reglamento.version} de "${reglamento.titulo}".`,
    tipo: 'aviso',
    accionUrl: '/portal/reglamento',
    dedupeHours: 12,
  });

  return summary;
}

export async function notifyMaintenanceCreated(item: typeof mantenimiento.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const managerIds = await getManagerUserIds(item.condominioId);

  summary.notificationsCreated += await notifyUsers(managerIds, item.condominioId, {
    titulo: item.tipo === 'incidente' ? 'Nuevo incidente reportado' : 'Nueva solicitud de mantenimiento',
    mensaje: `${item.titulo} (${item.prioridad}) requiere atención.`,
    tipo: 'mantenimiento',
    accionUrl: '/mantenimiento',
    dedupeHours: 2,
  });

  return summary;
}

export async function notifyMaintenanceUpdated(
  updated: typeof mantenimiento.$inferSelect,
  previous: typeof mantenimiento.$inferSelect
) {
  const summary = DEFAULT_SUMMARY();

  if (updated.estado === previous.estado) {
    return summary;
  }

  const recipientIds: string[] = [];
  if (updated.solicitanteId) recipientIds.push(updated.solicitanteId);

  if (updated.residenteId) {
    const [resident] = await db
      .select({ usuarioId: residentes.usuarioId })
      .from(residentes)
      .where(eq(residentes.id, updated.residenteId))
      .limit(1);
    if (resident?.usuarioId) recipientIds.push(resident.usuarioId);
  }

  summary.notificationsCreated += await notifyUsers(recipientIds, updated.condominioId, {
    titulo: 'Actualización de mantenimiento',
    mensaje: `${updated.titulo} cambió a estado ${updated.estado}.`,
    tipo: 'mantenimiento',
    accionUrl: '/portal/incidentes',
    dedupeHours: 2,
  });

  return summary;
}

export async function notifyReservationCreated(reservation: typeof reservaciones.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const managerIds = await getManagerUserIds(reservation.condominioId);

  summary.notificationsCreated += await notifyUsers(managerIds, reservation.condominioId, {
    titulo: 'Nueva reservación pendiente',
    mensaje: `Hay una nueva solicitud para ${reservation.area} pendiente de revisión.`,
    tipo: 'reservacion',
    accionUrl: '/reservaciones',
    dedupeHours: 2,
  });

  summary.notificationsCreated += await notifyUsers([reservation.usuarioId], reservation.condominioId, {
    titulo: 'Reservación registrada',
    mensaje: `Tu solicitud para ${reservation.area} fue enviada correctamente.`,
    tipo: 'info',
    accionUrl: '/portal/reservaciones',
    dedupeHours: 2,
  });

  return summary;
}

export async function notifyReservationStatusChange(
  updated: typeof reservaciones.$inferSelect,
  previous: typeof reservaciones.$inferSelect
) {
  const summary = DEFAULT_SUMMARY();

  if (updated.estado === previous.estado && updated.pagado === previous.pagado) {
    return summary;
  }

  if (updated.estado !== previous.estado) {
    const title =
      updated.estado === 'confirmado'
        ? 'Reservación aprobada'
        : updated.estado === 'cancelado'
        ? 'Reservación rechazada'
        : 'Reservación actualizada';

    const message =
      updated.estado === 'confirmado'
        ? `Tu reservación para ${updated.area} fue aprobada.`
        : updated.estado === 'cancelado'
        ? `Tu reservación para ${updated.area} fue rechazada.`
        : `Tu reservación para ${updated.area} cambió a estado ${updated.estado}.`;

    summary.notificationsCreated += await notifyUsers([updated.usuarioId], updated.condominioId, {
      titulo: title,
      mensaje: message,
      tipo: 'reservacion',
      accionUrl: '/portal/reservaciones',
      dedupeHours: 2,
    });
  }

  if (updated.pagado && !previous.pagado) {
    const managerIds = await getManagerUserIds(updated.condominioId);
    summary.notificationsCreated += await notifyUsers(managerIds, updated.condominioId, {
      titulo: 'Reservación marcada como pagada',
      mensaje: `La reservación de ${updated.area} fue marcada como pagada.`,
      tipo: 'reservacion',
      accionUrl: '/reservaciones',
      dedupeHours: 4,
    });
  }

  return summary;
}

export async function notifyVisitCreated(visita: typeof visitas.$inferSelect) {
  const summary = DEFAULT_SUMMARY();

  const securityIds = await getSecurityUserIds(visita.condominioId);
  const managerIds = await getManagerUserIds(visita.condominioId);
  const residentIds: string[] = [];

  const [resident] = await db
    .select({ usuarioId: residentes.usuarioId })
    .from(residentes)
    .where(eq(residentes.id, visita.residenteId))
    .limit(1);
  if (resident?.usuarioId) residentIds.push(resident.usuarioId);

  summary.notificationsCreated += await notifyUsers(
    [...securityIds, ...managerIds],
    visita.condominioId,
    {
      titulo: 'Nueva visita programada',
      mensaje: `${visita.nombreVisitante} fue registrado para ${new Date(visita.fechaEsperada).toLocaleString('es-MX')}.`,
      tipo: 'aviso',
      accionUrl: '/security/visitas',
      dedupeHours: 2,
    }
  );

  summary.notificationsCreated += await notifyUsers(residentIds, visita.condominioId, {
    titulo: 'Visita registrada',
    mensaje: `Tu visita para ${visita.nombreVisitante} quedó registrada correctamente.`,
    tipo: 'info',
    accionUrl: '/portal/visitas',
    dedupeHours: 2,
  });

  return summary;
}

export async function notifyVisitStatusChanged(
  updated: typeof visitas.$inferSelect,
  previous: typeof visitas.$inferSelect
) {
  const summary = DEFAULT_SUMMARY();
  if (updated.estado === previous.estado) return summary;

  const recipients: string[] = [];
  const [resident] = await db
    .select({ usuarioId: residentes.usuarioId })
    .from(residentes)
    .where(eq(residentes.id, updated.residenteId))
    .limit(1);

  if (resident?.usuarioId) recipients.push(resident.usuarioId);

  const managerIds = await getManagerUserIds(updated.condominioId);
  if (updated.estado === 'salida') {
    recipients.push(...managerIds);
  }

  summary.notificationsCreated += await notifyUsers(recipients, updated.condominioId, {
    titulo: 'Actualización de visita',
    mensaje:
      updated.estado === 'llegada'
        ? `${updated.nombreVisitante} fue registrado en acceso.`
        : `${updated.nombreVisitante} fue registrado de salida.`,
    tipo: 'aviso',
    accionUrl: updated.estado === 'llegada' ? '/portal/visitas' : '/security/visitas',
    dedupeHours: 2,
  });

  return summary;
}

export async function notifyContractLifecycle(contract: typeof contratos.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const managerIds = await getManagerUserIds(contract.condominioId);
  const endDate = normalizeDate(contract.fechaFin);

  if (!endDate) return summary;

  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 30) {
    summary.notificationsCreated += await notifyUsers(managerIds, contract.condominioId, {
      titulo: daysLeft <= 0 ? 'Contrato vencido' : 'Contrato próximo a vencer',
      mensaje:
        daysLeft <= 0
          ? `El contrato "${contract.partes}" ya se encuentra vencido.`
          : `El contrato "${contract.partes}" vence en ${daysLeft} día(s).`,
      tipo: 'aviso',
      accionUrl: '/contratos',
      dedupeHours: 12,
    });
  }

  return summary;
}

async function processPayments(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();

  const allPayments = await db
    .select({
      pago: pagos,
      condominiumId: unidades.condominiumId,
      numero: unidades.numero,
    })
    .from(pagos)
    .innerJoin(unidades, eq(unidades.id, pagos.unidadId))
    .where(condominioId ? eq(unidades.condominiumId, condominioId) : ne(pagos.estado, 'eliminado'));

  const residentMap = await getResidentUserIdsByUnitIds(
    [...new Set(allPayments.map((item) => item.pago.unidadId))]
  );

  for (const { pago, condominiumId, numero } of allPayments) {
    const dueDate = getPaymentDueDate(pago);
    if (!dueDate) continue;
    if (pago.estado === 'completado' || pago.estado === 'rechazado' || pago.estado === 'por_verificar') {
      continue;
    }

    const residentIds = residentMap.get(pago.unidadId) || [];
    const settings = await getAutomationSettings(condominiumId);
    const reminderWindowEnd = addDays(now, settings.paymentReminderDays);

    if (pago.estado === 'pendiente' && dueDate < now) {
      // Calculate initial mora if past grace period
      const graceCutoff = addDays(dueDate, settings.moraGraceDays);
      const monto = parseFloat(pago.monto) || 0;
      const montoPagado = parseFloat(pago.montoPagado) || 0;
      const pendingAmount = monto - montoPagado;
      let moraAmount = 0;
      let porcentajeMora = 0;

      if (now > graceCutoff && settings.moraPorcentaje > 0 && pendingAmount > 0) {
        const monthsOverdue = Math.max(1, Math.ceil(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        porcentajeMora = settings.moraPorcentaje * monthsOverdue;
        moraAmount = Math.round(pendingAmount * porcentajeMora / 100 * 100) / 100;
        summary.moraCalculations += 1;
      }

      await db
        .update(pagos)
        .set({
          estado: 'vencido',
          mora: String(moraAmount),
          porcentajeMora: String(porcentajeMora),
          moraCalculadaAt: moraAmount > 0 ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(pagos.id, pago.id));

      summary.paymentOverdues += 1;

      const moraMsg = moraAmount > 0
        ? ` Se generó una mora de $${moraAmount.toFixed(2)} (${porcentajeMora}%).`
        : '';

      summary.notificationsCreated += await notifyUsers(residentIds, condominiumId, {
        titulo: 'Pago vencido',
        mensaje: `El cargo "${pago.concepto}" de la unidad ${numero} fue marcado como vencido.${moraMsg}`,
        tipo: 'pago',
        accionUrl: '/portal/pagos',
        dedupeHours: 24,
      });

      const managerIds = await getManagerUserIds(condominiumId);
      summary.notificationsCreated += await notifyUsers(managerIds, condominiumId, {
        titulo: 'Pago vencido detectado',
        mensaje: `El cargo "${pago.concepto}" de la unidad ${numero} fue marcado como vencido.${moraMsg}`,
        tipo: 'pago',
        accionUrl: '/pagos',
        dedupeHours: 24,
      });
      continue;
    }

    // Recalculate mora for already-overdue payments (runs each sweep)
    if (pago.estado === 'vencido' && settings.moraPorcentaje > 0) {
      const monto = parseFloat(pago.monto) || 0;
      const montoPagado = parseFloat(pago.montoPagado) || 0;
      const pendingAmount = monto - montoPagado;

      if (pendingAmount > 0) {
        const monthsOverdue = Math.max(1, Math.ceil(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        const porcentajeMora = settings.moraPorcentaje * monthsOverdue;
        const moraAmount = Math.round(pendingAmount * porcentajeMora / 100 * 100) / 100;
        const currentMora = parseFloat(pago.mora) || 0;

        // Only update if mora changed
        if (Math.abs(moraAmount - currentMora) > 0.01) {
          await db
            .update(pagos)
            .set({
              mora: String(moraAmount),
              porcentajeMora: String(porcentajeMora),
              moraCalculadaAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(pagos.id, pago.id));

          summary.moraCalculations += 1;
        }
      }
    }

    if (pago.estado === 'pendiente' && dueDate >= now && dueDate <= reminderWindowEnd) {
      summary.paymentReminders += 1;
      summary.notificationsCreated += await notifyUsers(residentIds, condominiumId, {
        titulo: 'Recordatorio de pago pendiente',
        mensaje: `Tienes un pago pendiente: ${pago.concepto}. Vence el ${dueDate.toLocaleDateString('es-MX')}.`,
        tipo: 'pago',
        accionUrl: '/portal/pagos',
        dedupeHours: 24,
      });
    }
  }

  return summary;
}

async function processContracts(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();
  const contracts = await db
    .select()
    .from(contratos)
    .where(
      condominioId
        ? eq(contratos.condominioId, condominioId)
        : ne(contratos.estado, 'eliminado')
    );

  for (const contract of contracts) {
    const endDate = normalizeDate(contract.fechaFin);
    if (!endDate) continue;
    const managerIds = await getManagerUserIds(contract.condominioId);
    const settings = await getAutomationSettings(contract.condominioId);

    if (endDate <= now && contract.estado !== 'vencido') {
      await db
        .update(contratos)
        .set({ estado: 'vencido', updatedAt: new Date() })
        .where(eq(contratos.id, contract.id));

      summary.contractsExpired += 1;
      summary.notificationsCreated += await notifyUsers(managerIds, contract.condominioId, {
        titulo: 'Contrato vencido',
        mensaje: `El contrato "${contract.partes}" ya venció y fue marcado como vencido.`,
        tipo: 'aviso',
        accionUrl: '/contratos',
        dedupeHours: 24,
      });
      continue;
    }

    const reminderDate = addDays(now, settings.contractReminderDays);
    if (endDate > now && endDate <= reminderDate) {
      summary.contractReminders += 1;
      const diffDays = Math.max(
        1,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      summary.notificationsCreated += await notifyUsers(managerIds, contract.condominioId, {
        titulo: 'Contrato próximo a vencer',
        mensaje: `El contrato "${contract.partes}" vence en ${diffDays} día(s).`,
        tipo: 'aviso',
        accionUrl: '/contratos',
        dedupeHours: 24,
      });
    }
  }

  return summary;
}

async function processMaintenance(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();

  const items = await db
    .select()
    .from(mantenimiento)
    .where(condominioId ? eq(mantenimiento.condominioId, condominioId) : ne(mantenimiento.estado, 'eliminado'));

  for (const item of items) {
    const createdAt = normalizeDate(item.createdAt);
    const updatedAt = normalizeDate(item.updatedAt);
    if (!createdAt || !updatedAt) continue;
    const settings = await getAutomationSettings(item.condominioId);
    const highPriorityCutoff = addHours(now, -settings.maintenancePendingHighHours);
    const inProgressCutoff = addDays(now, -settings.maintenanceInProgressDays);

    const needsPendingEscalation =
      (item.prioridad === 'alta' || item.prioridad === 'urgente') &&
      item.estado === 'pendiente' &&
      createdAt <= highPriorityCutoff;

    const needsProgressEscalation =
      item.estado === 'en_proceso' && updatedAt <= inProgressCutoff;

    if (!needsPendingEscalation && !needsProgressEscalation) continue;

    const managerIds = await getManagerUserIds(item.condominioId);
    summary.maintenanceEscalations += 1;
    summary.notificationsCreated += await notifyUsers(managerIds, item.condominioId, {
      titulo: 'Seguimiento de mantenimiento requerido',
      mensaje: needsPendingEscalation
        ? `${item.titulo} sigue pendiente con prioridad ${item.prioridad}.`
        : `${item.titulo} lleva varios días en proceso y requiere seguimiento.`,
      tipo: 'mantenimiento',
      accionUrl: '/mantenimiento',
      dedupeHours: 12,
    });
  }

  return summary;
}

async function processVisits(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();

  const visitRows = await db
    .select()
    .from(visitas)
    .where(condominioId ? eq(visitas.condominioId, condominioId) : ne(visitas.estado, 'eliminado'));

  for (const visit of visitRows) {
    const expectedAt = normalizeDate(visit.fechaEsperada);
    const arrivalAt = normalizeDate(visit.llegadaAt);
    if (!expectedAt) continue;
    const settings = await getAutomationSettings(visit.condominioId);
    const upcomingLimit = addHours(now, settings.visitReminderHours);
    const staleArrivalCutoff = addHours(now, -settings.staleVisitHours);

    if (visit.estado === 'pendiente' && expectedAt >= now && expectedAt <= upcomingLimit) {
      const securityIds = await getSecurityUserIds(visit.condominioId);
      const managerIds = await getManagerUserIds(visit.condominioId);
      summary.visitReminders += 1;
      summary.notificationsCreated += await notifyUsers(
        [...securityIds, ...managerIds],
        visit.condominioId,
        {
          titulo: 'Visita próxima',
          mensaje: `${visit.nombreVisitante} está programado para las ${expectedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.`,
          tipo: 'aviso',
          accionUrl: '/security/visitas',
          dedupeHours: 6,
        }
      );
    }

    if (visit.estado === 'llegada' && arrivalAt && arrivalAt <= staleArrivalCutoff) {
      const managerIds = await getManagerUserIds(visit.condominioId);
      summary.staleVisitAlerts += 1;
      summary.notificationsCreated += await notifyUsers(managerIds, visit.condominioId, {
        titulo: 'Visita sin cierre',
        mensaje: `${visit.nombreVisitante} sigue marcada en llegada y requiere revisión.`,
        tipo: 'aviso',
        accionUrl: '/security/visitas',
        dedupeHours: 12,
      });
    }
  }

  return summary;
}

async function processReservations(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();
  const limit = addHours(now, 24);
  const reservations = await db
    .select()
    .from(reservaciones)
    .where(condominioId ? eq(reservaciones.condominioId, condominioId) : ne(reservaciones.estado, 'eliminado'));

  for (const reservation of reservations) {
    const startAt = normalizeDate(reservation.fechaInicio);
    if (!startAt) continue;
    if (reservation.estado !== 'confirmado' || reservation.pagado || startAt > limit || startAt < now) {
      continue;
    }

    summary.reservationReminders += 1;
    summary.notificationsCreated += await notifyUsers([reservation.usuarioId], reservation.condominioId, {
      titulo: 'Reservación pendiente de pago',
      mensaje: `Tu reservación de ${reservation.area} inicia pronto y sigue pendiente de pago.`,
      tipo: 'reservacion',
      accionUrl: '/portal/reservaciones',
      dedupeHours: 12,
    });
  }

  return summary;
}

async function processProviders(now: Date, condominioId?: string) {
  const summary = DEFAULT_SUMMARY();
  const rows = await db
    .select()
    .from(proveedores)
    .where(condominioId ? eq(proveedores.condominioId, condominioId) : ne(proveedores.estado, 'deleted'));

  for (const provider of rows) {
    const endDate = normalizeDate(provider.finContrato);
    if (!endDate) continue;
    const managerIds = await getManagerUserIds(provider.condominioId);
    const settings = await getAutomationSettings(provider.condominioId);
    const reminderDate = addDays(now, settings.providerReminderDays);

    if (endDate <= now && provider.estado !== 'suspended') {
      await db
        .update(proveedores)
        .set({ estado: 'suspended', updatedAt: new Date() })
        .where(eq(proveedores.id, provider.id));

      summary.providerSuspensions += 1;
      summary.notificationsCreated += await notifyUsers(managerIds, provider.condominioId, {
        titulo: 'Proveedor suspendido por vencimiento',
        mensaje: `${provider.nombreEmpresa} fue suspendido automáticamente por contrato vencido.`,
        tipo: 'aviso',
        accionUrl: '/contratos',
        dedupeHours: 24,
      });
      continue;
    }

    if (endDate > now && endDate <= reminderDate) {
      summary.providerReminders += 1;
      const daysLeft = Math.max(
        1,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      summary.notificationsCreated += await notifyUsers(managerIds, provider.condominioId, {
        titulo: 'Proveedor próximo a vencer',
        mensaje: `${provider.nombreEmpresa} vence en ${daysLeft} día(s).`,
        tipo: 'aviso',
        accionUrl: '/contratos',
        dedupeHours: 24,
      });
    }
  }

  return summary;
}

export async function notifyProviderLifecycle(provider: typeof proveedores.$inferSelect) {
  const summary = DEFAULT_SUMMARY();
  const managerIds = await getManagerUserIds(provider.condominioId);
  const endDate = normalizeDate(provider.finContrato);
  if (!endDate) return summary;

  const settings = await getAutomationSettings(provider.condominioId);
  const reminderDate = addDays(new Date(), settings.providerReminderDays);
  if (endDate <= reminderDate) {
    summary.notificationsCreated += await notifyUsers(managerIds, provider.condominioId, {
      titulo: 'Revisar vigencia de proveedor',
      mensaje: `${provider.nombreEmpresa} tiene vigencia próxima a vencer.`,
      tipo: 'aviso',
      accionUrl: '/contratos',
      dedupeHours: 12,
    });
  }

  return summary;
}

export async function runAutomationSweep(options?: { condominioId?: string }) {
  const startedAt = new Date();
  const summary = DEFAULT_SUMMARY();
  const [run] = await db
    .insert(automationRuns)
    .values({
      condominioId: options?.condominioId ?? null,
      tipo: 'sweep',
      estado: 'running',
      startedAt,
    })
    .returning();

  try {
    mergeSummary(summary, await processMonthlyMaintenanceFees(startedAt, options?.condominioId));
    mergeSummary(summary, await processPayments(startedAt, options?.condominioId));
    mergeSummary(summary, await processContracts(startedAt, options?.condominioId));
    mergeSummary(summary, await processProviders(startedAt, options?.condominioId));
    mergeSummary(summary, await processMaintenance(startedAt, options?.condominioId));
    mergeSummary(summary, await processVisits(startedAt, options?.condominioId));
    mergeSummary(summary, await processReservations(startedAt, options?.condominioId));

    await db
      .update(automationRuns)
      .set({
        estado: 'completed',
        summary,
        completedAt: new Date(),
      })
      .where(eq(automationRuns.id, run.id));

    logger.info('Automation sweep completed', {
      condominioId: options?.condominioId ?? null,
      ...summary,
    });

    return summary;
  } catch (error) {
    await db
      .update(automationRuns)
      .set({
        estado: 'failed',
        summary,
        error: error instanceof Error ? error.message : 'Unknown automation error',
        completedAt: new Date(),
      })
      .where(eq(automationRuns.id, run.id));
    throw error;
  }
}

export function startAutomationScheduler() {
  if (!AUTOMATIONS_ENABLED || schedulerHandle) {
    return;
  }

  schedulerHandle = setInterval(async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;

    try {
      await runAutomationSweep();
    } catch (error) {
      logger.error('Automation scheduler run failed', error);
    } finally {
      schedulerRunning = false;
    }
  }, AUTOMATION_INTERVAL_MS);

  logger.info(`Automation scheduler started (every ${AUTOMATION_INTERVAL_MS / 60000} min)`);
}

export function stopAutomationScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
