import { closeDatabase, initializeDatabase } from '../db';
import { runAutomationSweep } from '../services/automation.service';
import logger from '../utils/logger';

async function main() {
  const condominioId = process.argv[2];

  try {
    await initializeDatabase();
    const summary = await runAutomationSweep({ condominioId });
    logger.info('Automation runner completed successfully', {
      condominioId: condominioId ?? null,
      summary,
    });
  } catch (error) {
    logger.error('Automation runner failed', error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
