import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { db } from '../../db';
import { conciliaciones, movimientosBancarios, gastos, pagos, unidades } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { logAudit } from '../../utils/audit';

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface RawMovimiento {
  fecha: Date;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'cargo' | 'abono';
  saldo?: number;
}

/**
 * Parses a CSV bank statement into raw movements.
 * Supports common Mexican bank formats (BBVA, Santander, Banorte, HSBC).
 * Expected columns (flexible order): fecha, descripcion/concepto, referencia, cargo, abono, saldo
 */
function parseCSV(csvContent: string): RawMovimiento[] {
  const lines = csvContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) throw new Error('El archivo CSV está vacío o tiene formato incorrecto');

  // Detect separator
  const sep = lines[0].includes(';') ? ';' : ',';

  const headers = lines[0]
    .split(sep)
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  const idx = {
    fecha: headers.findIndex((h) => h.includes('fecha') || h === 'date'),
    descripcion: headers.findIndex(
      (h) => h.includes('descrip') || h.includes('concepto') || h.includes('movimiento') || h === 'detail'
    ),
    referencia: headers.findIndex(
      (h) => h.includes('referencia') || h.includes('folio') || h.includes('ref') || h === 'reference'
    ),
    cargo: headers.findIndex((h) => h === 'cargo' || h === 'débito' || h === 'debito' || h === 'debit'),
    abono: headers.findIndex((h) => h === 'abono' || h === 'crédito' || h === 'credito' || h === 'credit'),
    monto: headers.findIndex((h) => h === 'monto' || h === 'importe' || h === 'amount'),
    saldo: headers.findIndex((h) => h === 'saldo' || h === 'balance'),
  };

  if (idx.fecha === -1 || idx.descripcion === -1) {
    throw new Error(
      'No se encontraron las columnas requeridas (fecha, descripcion). ' +
        `Columnas detectadas: ${headers.join(', ')}`
    );
  }

  const movimientos: RawMovimiento[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/['"]/g, ''));
    if (cols.length < 2) continue;

    const fechaStr = cols[idx.fecha];
    const fecha = parseFecha(fechaStr);
    if (!fecha) continue; // Skip non-data rows

    const descripcion = cols[idx.descripcion] || '';
    const referencia = idx.referencia >= 0 ? cols[idx.referencia] || '' : '';

    let monto = 0;
    let tipo: 'cargo' | 'abono' = 'cargo';

    if (idx.cargo >= 0 && idx.abono >= 0) {
      const cargoVal = parseMonto(cols[idx.cargo]);
      const abonoVal = parseMonto(cols[idx.abono]);
      if (cargoVal > 0) {
        monto = cargoVal;
        tipo = 'cargo';
      } else if (abonoVal > 0) {
        monto = abonoVal;
        tipo = 'abono';
      }
    } else if (idx.monto >= 0) {
      const raw = parseMonto(cols[idx.monto]);
      monto = Math.abs(raw);
      tipo = raw < 0 ? 'cargo' : 'abono';
    }

    if (monto === 0) continue;

    const saldo = idx.saldo >= 0 ? parseMonto(cols[idx.saldo]) : undefined;

    movimientos.push({ fecha, descripcion, referencia, monto, tipo, saldo });
  }

  return movimientos;
}

function parseFecha(str: string): Date | null {
  if (!str) return null;
  // Formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];
  for (const fmt of formats) {
    const m = str.match(fmt);
    if (m) {
      const [, a, b, c] = m;
      const d = fmt === formats[1]
        ? new Date(`${a}-${b}-${c}`)
        : new Date(`${c}-${b}-${a}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function parseMonto(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1');
  return parseFloat(cleaned) || 0;
}

// ─── Auto-Match Algorithm ─────────────────────────────────────────────────────

interface GastoRecord {
  id: string;
  concepto: string;
  monto: string;
  fechaGasto: Date;
  categoria: string;
}

/**
 * Calculates match score (0-100) between a bank movement and a recorded expense.
 */
function calcularScore(mov: RawMovimiento, gasto: GastoRecord): number {
  const gastoMonto = parseFloat(gasto.monto);
  const movMonto = mov.monto;

  // Monto score (60 pts max) — exact = 60, within 1% = 40, within 5% = 20
  let montoScore = 0;
  const diff = Math.abs(movMonto - gastoMonto);
  const pct = gastoMonto > 0 ? diff / gastoMonto : 1;
  if (pct === 0) montoScore = 60;
  else if (pct <= 0.01) montoScore = 40;
  else if (pct <= 0.05) montoScore = 20;

  // Fecha score (25 pts max) — same day = 25, ±2d = 18, ±5d = 10, ±10d = 5
  const diasDiff = Math.abs(
    (mov.fecha.getTime() - gasto.fechaGasto.getTime()) / (1000 * 60 * 60 * 24)
  );
  let fechaScore = 0;
  if (diasDiff === 0) fechaScore = 25;
  else if (diasDiff <= 2) fechaScore = 18;
  else if (diasDiff <= 5) fechaScore = 10;
  else if (diasDiff <= 10) fechaScore = 5;

  // Concepto score (15 pts max) — keyword overlap
  const movWords = new Set(
    mov.descripcion.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const gastoWords = gasto.concepto.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const matches = gastoWords.filter((w) => movWords.has(w)).length;
  const conceptoScore = gastoWords.length > 0 ? Math.min(15, (matches / gastoWords.length) * 15) : 0;

  return Math.round(montoScore + fechaScore + conceptoScore);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /conciliacion/generar-automatica
 * Generates a conciliation period automatically from pagos (ingresos) and gastos (egresos).
 * No CSV required — data is pulled directly from the DB.
 * Card payments and all other pagos with estado='completado' are included automatically.
 */
export const generarConciliacionAutomatica = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, nombre, periodoInicio, periodoFin } = req.body;

    const inicio = new Date(periodoInicio);
    inicio.setUTCHours(0, 0, 0, 0); // UTC start of day
    const fin = new Date(periodoFin);
    // Extend to 11:59 PM next day UTC so payments made late at night
    // in Mexico (UTC-6/UTC-5) are included in the correct local date.
    // e.g. periodoFin=2026-03-10 covers payments up to 2026-03-11T11:59Z
    fin.setUTCHours(35, 59, 59, 999); // 35h = next day 11:59 AM UTC

    // Fetch completed pagos for this condominio in the period (via unidades join)
    const pagosDB = await db
      .select({
        id: pagos.id,
        monto: pagos.monto,
        concepto: pagos.concepto,
        metodoPago: pagos.metodoPago,
        referencia: pagos.referencia,
        fechaPago: pagos.fechaPago,
      })
      .from(pagos)
      .innerJoin(unidades, eq(pagos.unidadId, unidades.id))
      .where(
        and(
          eq(unidades.condominiumId, condominioId),
          eq(pagos.estado, 'completado'),
          gte(pagos.fechaPago, inicio),
          lte(pagos.fechaPago, fin),
        )
      );

    // Fetch gastos for this condominio in the period
    const gastosDB = await db
      .select()
      .from(gastos)
      .where(
        and(
          eq(gastos.condominioId, condominioId),
          gte(gastos.fechaGasto, inicio),
          lte(gastos.fechaGasto, fin),
        )
      );

    const totalIngresos = pagosDB.reduce((s, p) => s + parseFloat(p.monto), 0);
    const totalEgresos = gastosDB.reduce((s, g) => s + parseFloat(g.monto), 0);
    const balance = totalIngresos - totalEgresos;
    const totalMovimientos = pagosDB.length + gastosDB.length;

    // Create conciliacion header
    const [conciliacion] = await db
      .insert(conciliaciones)
      .values({
        condominioId,
        nombre,
        banco: 'Colmena Automático',
        periodoInicio: inicio,
        periodoFin: fin,
        saldoInicial: '0',
        saldoFinal: balance.toFixed(2),
        totalMovimientos,
        totalConciliados: totalMovimientos,
        totalDiferencia: '0',
        estado: 'completado',
      })
      .returning();

    // Build movimientos for pagos (abonos = ingresos)
    const pagoMovs = pagosDB.map((p) => ({
      conciliacionId: conciliacion.id,
      condominioId,
      fecha: p.fechaPago!,
      descripcion: `${p.concepto}${p.metodoPago ? ` · ${p.metodoPago}` : ''}`,
      referencia: p.referencia ?? '',
      monto: p.monto,
      tipo: 'abono' as const,
      estado: 'conciliado' as const,
      pagoId: p.id,
      scoreMatch: '100',
    }));

    // Build movimientos for gastos (cargos = egresos)
    const gastoMovs = gastosDB.map((g) => ({
      conciliacionId: conciliacion.id,
      condominioId,
      fecha: g.fechaGasto,
      descripcion: g.concepto,
      referencia: g.categoria,
      monto: g.monto,
      tipo: 'cargo' as const,
      estado: 'conciliado' as const,
      gastoId: g.id,
      scoreMatch: '100',
    }));

    const allMovs = [...pagoMovs, ...gastoMovs];
    if (allMovs.length > 0) {
      await db.insert(movimientosBancarios).values(allMovs);
    }

    logger.info(`Conciliación automática creada: ${conciliacion.id} — ${pagosDB.length} ingresos, ${gastosDB.length} egresos`);

    await logAudit({
      usuarioId: req.user!.userId,
      condominioId,
      accion: 'create',
      entidad: 'conciliacion',
      entidadId: conciliacion.id,
      detalles: { nombre, totalIngresos, totalEgresos, balance, automatica: true },
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: 'success',
      message: `Conciliación generada: ${pagosDB.length} ingresos, ${gastosDB.length} egresos`,
      data: {
        conciliacion: {
          ...conciliacion,
          totalMovimientos,
          totalConciliados: totalMovimientos,
          resumen: {
            totalIngresos: totalIngresos.toFixed(2),
            totalEgresos: totalEgresos.toFixed(2),
            balance: balance.toFixed(2),
            pagosCount: pagosDB.length,
            gastosCount: gastosDB.length,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error in generarConciliacionAutomatica:', error);
    next(error);
  }
};

/**
 * POST /conciliacion/upload
 * Receives CSV content as text in body, creates conciliacion + movimientos + auto-matches
 */
export const uploadEstadoBancario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { condominioId, nombre, banco, periodoInicio, periodoFin, saldoInicial, saldoFinal, csvContent } = req.body;

    // Parse CSV
    let rawMovimientos: RawMovimiento[];
    try {
      rawMovimientos = parseCSV(csvContent);
    } catch (e: any) {
      return next(AppError.badRequest(e.message));
    }

    if (rawMovimientos.length === 0) {
      return next(AppError.badRequest('No se encontraron movimientos válidos en el archivo'));
    }

    // Fetch gastos of this condominio in period for auto-matching
    const gastosDB: GastoRecord[] = await db
      .select({
        id: gastos.id,
        concepto: gastos.concepto,
        monto: gastos.monto,
        fechaGasto: gastos.fechaGasto,
        categoria: gastos.categoria,
      })
      .from(gastos)
      .where(eq(gastos.condominioId, condominioId));

    // Create conciliacion header
    const [conciliacion] = await db
      .insert(conciliaciones)
      .values({
        condominioId,
        nombre,
        banco,
        periodoInicio: new Date(periodoInicio),
        periodoFin: new Date(periodoFin),
        saldoInicial: saldoInicial?.toString() ?? '0',
        saldoFinal: saldoFinal?.toString() ?? '0',
        totalMovimientos: rawMovimientos.length,
        estado: 'en_proceso',
      })
      .returning();

    // Auto-match and insert movements
    let autoConciliados = 0;
    const usedGastoIds = new Set<string>();

    const movValues = rawMovimientos.map((mov) => {
      // Find best matching gasto (not already matched)
      let bestGastoId: string | null = null;
      let bestScore = 0;

      for (const gasto of gastosDB) {
        if (usedGastoIds.has(gasto.id)) continue;
        if (mov.tipo === 'abono') continue; // Abonos no son gastos

        const score = calcularScore(mov, gasto);
        if (score > bestScore) {
          bestScore = score;
          bestGastoId = gasto.id;
        }
      }

      const autoMatch = bestScore >= 70 && bestGastoId;
      if (autoMatch) {
        usedGastoIds.add(bestGastoId!);
        autoConciliados++;
      }

      return {
        conciliacionId: conciliacion.id,
        condominioId,
        fecha: mov.fecha,
        descripcion: mov.descripcion,
        referencia: mov.referencia,
        monto: mov.monto.toFixed(2),
        tipo: mov.tipo,
        saldo: mov.saldo != null ? mov.saldo.toFixed(2) : null,
        estado: autoMatch ? 'conciliado' : 'pendiente',
        gastoId: autoMatch ? bestGastoId : null,
        scoreMatch: bestScore > 0 ? bestScore.toFixed(2) : null,
      };
    });

    await db.insert(movimientosBancarios).values(movValues);

    // Update header totals
    const totalGastosRegistrados = rawMovimientos
      .filter((m) => m.tipo === 'cargo')
      .reduce((s, m) => s + m.monto, 0);

    const totalBanco = parseFloat(saldoInicial ?? '0') - totalGastosRegistrados;
    const diferencia = parseFloat(saldoFinal ?? '0') - totalBanco;

    await db
      .update(conciliaciones)
      .set({
        totalConciliados: autoConciliados,
        totalDiferencia: diferencia.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(conciliaciones.id, conciliacion.id));

    logger.info(`Conciliación creada: ${conciliacion.id} con ${rawMovimientos.length} movimientos, ${autoConciliados} auto-conciliados`);

    await logAudit({
      usuarioId: req.user!.userId,
      condominioId,
      accion: 'create',
      entidad: 'conciliacion',
      entidadId: conciliacion.id,
      detalles: { nombre, banco, totalMovimientos: rawMovimientos.length, autoConciliados },
      ipAddress: req.ip,
    });

    res.status(201).json({
      status: 'success',
      message: `Estado de cuenta procesado: ${rawMovimientos.length} movimientos, ${autoConciliados} conciliados automáticamente`,
      data: {
        conciliacion: { ...conciliacion, totalMovimientos: rawMovimientos.length, totalConciliados: autoConciliados },
      },
    });
  } catch (error) {
    logger.error('Error in uploadEstadoBancario:', error);
    next(error);
  }
};

/**
 * GET /conciliacion/condominio/:condominioId
 */
export const getConciliacionesByCondominio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condominioId } = req.params;

    const result = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.condominioId, condominioId))
      .orderBy(desc(conciliaciones.createdAt));

    res.status(200).json({ status: 'success', results: result.length, data: { conciliaciones: result } });
  } catch (error) {
    logger.error('Error in getConciliacionesByCondominio:', error);
    next(error);
  }
};

/**
 * GET /conciliacion/:id/movimientos
 * Returns movements with their matched gasto info
 */
export const getMovimientos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [conciliacion] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id))
      .limit(1);

    if (!conciliacion) return next(AppError.notFound('Conciliación no encontrada'));

    const movimientos = await db
      .select({
        movimiento: movimientosBancarios,
        gasto: {
          id: gastos.id,
          concepto: gastos.concepto,
          monto: gastos.monto,
          categoria: gastos.categoria,
          fechaGasto: gastos.fechaGasto,
        },
        pago: {
          id: pagos.id,
          concepto: pagos.concepto,
          monto: pagos.monto,
          metodoPago: pagos.metodoPago,
          referencia: pagos.referencia,
          fechaPago: pagos.fechaPago,
        },
      })
      .from(movimientosBancarios)
      .leftJoin(gastos, eq(movimientosBancarios.gastoId, gastos.id))
      .leftJoin(pagos, eq(movimientosBancarios.pagoId, pagos.id))
      .where(eq(movimientosBancarios.conciliacionId, id));

    // Also return unmatched gastos in the period for manual matching
    const gastosSinConciliar = await db
      .select()
      .from(gastos)
      .where(eq(gastos.condominioId, conciliacion.condominioId));

    const conciliadosGastoIds = new Set(
      movimientos.filter((m) => m.movimiento.gastoId).map((m) => m.movimiento.gastoId!)
    );

    const gastosPendientes = gastosSinConciliar.filter((g) => !conciliadosGastoIds.has(g.id));

    res.status(200).json({
      status: 'success',
      data: {
        conciliacion,
        movimientos,
        gastosPendientes,
        resumen: {
          total: movimientos.length,
          conciliados: movimientos.filter((m) => m.movimiento.estado === 'conciliado').length,
          pendientes: movimientos.filter((m) => m.movimiento.estado === 'pendiente').length,
          ignorados: movimientos.filter((m) => m.movimiento.estado === 'ignorado').length,
        },
      },
    });
  } catch (error) {
    logger.error('Error in getMovimientos:', error);
    next(error);
  }
};

/**
 * POST /conciliacion/:id/confirmar
 * Body: { matches: [{ movimientoId, gastoId }], ignorados: [movimientoId] }
 */
export const confirmarConciliacion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(AppError.unprocessableEntity('Errores de validación', errors.array()));

    const { id } = req.params;
    const { matches = [], ignorados = [] } = req.body;

    const [conciliacion] = await db
      .select()
      .from(conciliaciones)
      .where(eq(conciliaciones.id, id))
      .limit(1);

    if (!conciliacion) return next(AppError.notFound('Conciliación no encontrada'));

    // Apply manual matches
    for (const { movimientoId, gastoId } of matches) {
      await db
        .update(movimientosBancarios)
        .set({ estado: 'conciliado', gastoId, updatedAt: new Date() } as any)
        .where(and(eq(movimientosBancarios.id, movimientoId), eq(movimientosBancarios.conciliacionId, id)));
    }

    // Mark ignored
    for (const movimientoId of ignorados) {
      await db
        .update(movimientosBancarios)
        .set({ estado: 'ignorado' } as any)
        .where(and(eq(movimientosBancarios.id, movimientoId), eq(movimientosBancarios.conciliacionId, id)));
    }

    // Recalculate totals
    const allMovs = await db
      .select({ estado: movimientosBancarios.estado })
      .from(movimientosBancarios)
      .where(eq(movimientosBancarios.conciliacionId, id));

    const totalConciliados = allMovs.filter((m) => m.estado === 'conciliado').length;
    const allDone = allMovs.every((m) => m.estado !== 'pendiente');

    await db
      .update(conciliaciones)
      .set({
        totalConciliados,
        estado: allDone ? 'completado' : 'en_proceso',
        revisadoPor: req.user!.userId,
        updatedAt: new Date(),
      })
      .where(eq(conciliaciones.id, id));

    logger.info(`Conciliación ${id} actualizada: ${totalConciliados} conciliados`);

    await logAudit({
      usuarioId: req.user!.userId,
      condominioId: conciliacion.condominioId,
      accion: 'update',
      entidad: 'conciliacion',
      entidadId: id,
      detalles: { matches: matches.length, ignorados: ignorados.length, totalConciliados },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: `Conciliación actualizada: ${totalConciliados} movimientos conciliados`,
      data: { totalConciliados, estado: allDone ? 'completado' : 'en_proceso' },
    });
  } catch (error) {
    logger.error('Error in confirmarConciliacion:', error);
    next(error);
  }
};

/**
 * GET /conciliacion/:id/reporte
 */
export const getReporte = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [conciliacion] = await db.select().from(conciliaciones).where(eq(conciliaciones.id, id)).limit(1);
    if (!conciliacion) return next(AppError.notFound('Conciliación no encontrada'));

    const movimientos = await db
      .select({
        movimiento: movimientosBancarios,
        gasto: {
          id: gastos.id,
          concepto: gastos.concepto,
          monto: gastos.monto,
          categoria: gastos.categoria,
        },
        pago: {
          id: pagos.id,
          concepto: pagos.concepto,
          monto: pagos.monto,
          metodoPago: pagos.metodoPago,
        },
      })
      .from(movimientosBancarios)
      .leftJoin(gastos, eq(movimientosBancarios.gastoId, gastos.id))
      .leftJoin(pagos, eq(movimientosBancarios.pagoId, pagos.id))
      .where(eq(movimientosBancarios.conciliacionId, id));

    const totalCargos = movimientos
      .filter((m) => m.movimiento.tipo === 'cargo')
      .reduce((s, m) => s + parseFloat(m.movimiento.monto), 0);

    const totalAbonos = movimientos
      .filter((m) => m.movimiento.tipo === 'abono')
      .reduce((s, m) => s + parseFloat(m.movimiento.monto), 0);

    const conciliados = movimientos.filter((m) => m.movimiento.estado === 'conciliado');
    const pendientes = movimientos.filter((m) => m.movimiento.estado === 'pendiente');

    const montoConciliado = conciliados
      .filter((m) => m.movimiento.tipo === 'cargo')
      .reduce((s, m) => s + parseFloat(m.movimiento.monto), 0);

    const montoPendiente = pendientes
      .filter((m) => m.movimiento.tipo === 'cargo')
      .reduce((s, m) => s + parseFloat(m.movimiento.monto), 0);

    res.status(200).json({
      status: 'success',
      data: {
        conciliacion,
        reporte: {
          totalCargos: totalCargos.toFixed(2),
          totalAbonos: totalAbonos.toFixed(2),
          diferencia: conciliacion.totalDiferencia,
          montoConciliado: montoConciliado.toFixed(2),
          montoPendiente: montoPendiente.toFixed(2),
          porcentajeConciliado:
            totalCargos > 0 ? ((montoConciliado / totalCargos) * 100).toFixed(1) : '0',
          movimientosConciliados: conciliados,
          movimientosPendientes: pendientes,
        },
      },
    });
  } catch (error) {
    logger.error('Error in getReporte:', error);
    next(error);
  }
};

/**
 * DELETE /conciliacion/:id
 */
export const deleteConciliacion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(conciliaciones).where(eq(conciliaciones.id, id)).limit(1);
    if (!existing) return next(AppError.notFound('Conciliación no encontrada'));

    await db.delete(conciliaciones).where(eq(conciliaciones.id, id));

    logger.info(`Conciliación deleted: ${id}`);
    res.status(200).json({ status: 'success', message: 'Conciliación eliminada' });
  } catch (error) {
    logger.error('Error in deleteConciliacion:', error);
    next(error);
  }
};
