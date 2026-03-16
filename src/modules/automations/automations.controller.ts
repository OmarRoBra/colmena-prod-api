import { Request, Response, NextFunction } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { automationRuns } from '../../db/schema';
import { runAutomationSweep } from '../../services/automation.service';
import logger from '../../utils/logger';
import { AppError } from '../../utils/appError';

function assertCronAuthorization(req: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!expectedSecret) {
    throw AppError.internal('CRON_SECRET no está configurado');
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    throw AppError.unauthorized('Cron no autorizado');
  }
}

export const runAutomationsFromCron = async (req: Request, res: Response, next: NextFunction) => {
  try {
    assertCronAuthorization(req);

    const summary = await runAutomationSweep();

    res.status(200).json({
      status: 'success',
      message: 'Automatizaciones ejecutadas desde Vercel Cron',
      data: { summary },
    });
  } catch (error) {
    logger.error('Error running cron automations:', error);
    next(error);
  }
};

export const runAutomations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condominioId =
      typeof req.body?.condominioId === 'string' && req.body.condominioId.trim()
        ? req.body.condominioId.trim()
        : undefined;

    const summary = await runAutomationSweep({ condominioId });

    res.status(200).json({
      status: 'success',
      message: condominioId
        ? 'Automatizaciones ejecutadas para el condominio indicado'
        : 'Automatizaciones ejecutadas correctamente',
      data: { summary },
    });
  } catch (error) {
    logger.error('Error running automations:', error);
    next(error);
  }
};

export const getAutomationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condominioId =
      typeof req.query?.condominioId === 'string' && req.query.condominioId.trim()
        ? req.query.condominioId.trim()
        : undefined;

    const rows = condominioId
      ? await db
          .select()
          .from(automationRuns)
          .where(eq(automationRuns.condominioId, condominioId))
          .orderBy(desc(automationRuns.startedAt))
      : await db
          .select()
          .from(automationRuns)
          .orderBy(desc(automationRuns.startedAt));

    res.status(200).json({
      status: 'success',
      results: rows.length,
      data: { runs: rows },
    });
  } catch (error) {
    logger.error('Error loading automation history:', error);
    next(error);
  }
};
