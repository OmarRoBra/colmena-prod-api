import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { and, eq, gte, lte, or } from 'drizzle-orm';
import { db } from '../../db';
import { encuestas, encuestaRespuestas, condominios, residentes } from '../../db/schema';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';

const normalizeDestinatario = (tipo?: string | null) => {
  if (!tipo) return 'todos';
  const normalized = tipo.toLowerCase();
  if (normalized === 'propietario') return 'propietarios';
  if (normalized === 'inquilino') return 'inquilinos';
  return 'todos';
};

export const getEncuestasByCondominio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { condominioId } = req.params;

    const result = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.condominioId, condominioId));

    const withCounts = await Promise.all(
      result.map(async (enc) => {
        const respuestas = await db
          .select()
          .from(encuestaRespuestas)
          .where(eq(encuestaRespuestas.encuestaId, enc.id));
        return { ...enc, totalRespuestas: respuestas.length };
      })
    );

    res.status(200).json({
      status: 'success',
      results: withCounts.length,
      encuestas: withCounts,
    });
  } catch (error) {
    logger.error('Error in getEncuestasByCondominio:', error);
    next(error);
  }
};

export const getEncuestaById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const [encuesta] = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.id, id))
      .limit(1);

    if (!encuesta) {
      return next(AppError.notFound('Encuesta no encontrada'));
    }

    res.status(200).json({ status: 'success', encuesta });
  } catch (error) {
    logger.error('Error in getEncuestaById:', error);
    next(error);
  }
};

export const createEncuesta = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const {
      condominioId,
      titulo,
      descripcion,
      fechaInicio,
      fechaFin,
      destinatarios,
      estado,
      preguntas: preguntasInput,
    } = req.body;

    const [condo] = await db
      .select()
      .from(condominios)
      .where(eq(condominios.id, condominioId))
      .limit(1);
    if (!condo) {
      return next(AppError.notFound('Condominio no encontrado'));
    }

    const preguntasWithIds = (preguntasInput as any[]).map((q: any, index: number) => ({
      id: q.id || `q_${Date.now()}_${index}`,
      texto: q.texto,
      tipo: q.tipo,
      opciones: q.tipo === 'opcion_multiple' ? (q.opciones ?? []) : undefined,
    }));

    const [newEncuesta] = await db
      .insert(encuestas)
      .values({
        condominioId,
        titulo,
        descripcion: descripcion ?? null,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        destinatarios: destinatarios ?? 'todos',
        estado: estado ?? 'activo',
        preguntas: preguntasWithIds,
      })
      .returning();

    logger.info(`Encuesta created: ${newEncuesta.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Encuesta creada exitosamente',
      encuesta: newEncuesta,
    });
  } catch (error) {
    logger.error('Error in createEncuesta:', error);
    next(error);
  }
};

export const deleteEncuesta = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.id, id))
      .limit(1);
    if (!existing) {
      return next(AppError.notFound('Encuesta no encontrada'));
    }

    await db.delete(encuestas).where(eq(encuestas.id, id));

    logger.info(`Encuesta deleted: ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Encuesta eliminada exitosamente',
    });
  } catch (error) {
    logger.error('Error in deleteEncuesta:', error);
    next(error);
  }
};

export const getRespuestas = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;

    const [encuesta] = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.id, id))
      .limit(1);
    if (!encuesta) {
      return next(AppError.notFound('Encuesta no encontrada'));
    }

    const result = await db
      .select()
      .from(encuestaRespuestas)
      .where(eq(encuestaRespuestas.encuestaId, id));

    res.status(200).json({
      status: 'success',
      results: result.length,
      respuestas: result,
    });
  } catch (error) {
    logger.error('Error in getRespuestas:', error);
    next(error);
  }
};

export const createRespuesta = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const { id } = req.params;
    const { respondidoPor, unidadId, respuestas: respuestasInput } = req.body;

    const [encuesta] = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.id, id))
      .limit(1);
    if (!encuesta) {
      return next(AppError.notFound('Encuesta no encontrada'));
    }
    if (encuesta.estado === 'cerrado') {
      return next(AppError.badRequest('Esta encuesta ya está cerrada'));
    }

    const [newRespuesta] = await db
      .insert(encuestaRespuestas)
      .values({
        encuestaId: id,
        respondidoPor,
        unidadId: unidadId ?? null,
        respuestas: respuestasInput,
      })
      .returning();

    logger.info(`Respuesta created for encuesta ${id}: ${newRespuesta.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Respuesta enviada exitosamente',
      respuesta: newRespuesta,
    });
  } catch (error) {
    logger.error('Error in createRespuesta:', error);
    next(error);
  }
};

export const getEncuestasForCurrentResident = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const [residente] = await db
      .select()
      .from(residentes)
      .where(eq(residentes.usuarioId, userId))
      .limit(1);

    if (!residente) {
      return next(AppError.notFound('No se encontro el perfil del residente'));
    }

    const destinatarioPermitido = normalizeDestinatario(residente.tipo);
    const now = new Date();

    const result = await db
      .select()
      .from(encuestas)
      .where(
        and(
          eq(encuestas.condominioId, residente.condominioId),
          eq(encuestas.estado, 'activo'),
          lte(encuestas.fechaInicio, now),
          gte(encuestas.fechaFin, now),
          or(
            eq(encuestas.destinatarios, 'todos'),
            eq(encuestas.destinatarios, destinatarioPermitido)
          )
        )
      );

    const withResidentState = await Promise.all(
      result.map(async (enc) => {
        const respuestas = await db
          .select()
          .from(encuestaRespuestas)
          .where(eq(encuestaRespuestas.encuestaId, enc.id));

        const myResponse = residente.unidadId
          ? respuestas.find((respuesta) => respuesta.unidadId === residente.unidadId)
          : respuestas.find((respuesta) => respuesta.respondidoPor === residente.nombre);

        return {
          ...enc,
          totalRespuestas: respuestas.length,
          respondidaPorMi: Boolean(myResponse),
          miRespuestaId: myResponse?.id ?? null,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: withResidentState.length,
      encuestas: withResidentState,
    });
  } catch (error) {
    logger.error('Error in getEncuestasForCurrentResident:', error);
    next(error);
  }
};

export const createRespuestaAsResident = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(AppError.unprocessableEntity('Errores de validación', errors.array()));
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('No autenticado'));
    }

    const { id } = req.params;
    const { respuestas: respuestasInput } = req.body;

    const [residente] = await db
      .select()
      .from(residentes)
      .where(eq(residentes.usuarioId, userId))
      .limit(1);

    if (!residente) {
      return next(AppError.notFound('No se encontro el perfil del residente'));
    }

    const [encuesta] = await db
      .select()
      .from(encuestas)
      .where(eq(encuestas.id, id))
      .limit(1);

    if (!encuesta) {
      return next(AppError.notFound('Encuesta no encontrada'));
    }

    const destinatarioPermitido = normalizeDestinatario(residente.tipo);
    const now = new Date();

    if (encuesta.condominioId !== residente.condominioId) {
      return next(AppError.forbidden('Esta encuesta no pertenece a tu condominio'));
    }

    if (encuesta.estado !== 'activo') {
      return next(AppError.badRequest('Esta encuesta no está disponible'));
    }

    if (encuesta.fechaInicio > now || encuesta.fechaFin < now) {
      return next(AppError.badRequest('Esta encuesta ya no está disponible para responder'));
    }

    if (
      encuesta.destinatarios !== 'todos' &&
      encuesta.destinatarios !== destinatarioPermitido
    ) {
      return next(AppError.forbidden('Esta encuesta no está dirigida a tu perfil'));
    }

    const existingResponses = await db
      .select()
      .from(encuestaRespuestas)
      .where(eq(encuestaRespuestas.encuestaId, id));

    const duplicate = residente.unidadId
      ? existingResponses.find((respuesta) => respuesta.unidadId === residente.unidadId)
      : existingResponses.find((respuesta) => respuesta.respondidoPor === residente.nombre);

    if (duplicate) {
      return next(AppError.conflict('Esta encuesta ya fue respondida por tu unidad'));
    }

    const [newRespuesta] = await db
      .insert(encuestaRespuestas)
      .values({
        encuestaId: id,
        respondidoPor: residente.nombre,
        unidadId: residente.unidadId ?? null,
        respuestas: respuestasInput,
      })
      .returning();

    logger.info(`Resident response created for encuesta ${id}: ${newRespuesta.id}`);

    res.status(201).json({
      status: 'success',
      message: 'Respuesta enviada exitosamente',
      respuesta: newRespuesta,
    });
  } catch (error) {
    logger.error('Error in createRespuestaAsResident:', error);
    next(error);
  }
};
