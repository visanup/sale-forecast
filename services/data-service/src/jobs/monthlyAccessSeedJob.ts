import type { Logger } from 'pino';
import { config } from '../config/config.js';
import { seedDefaultMonthlyAccess } from '../services/monthlyAccessSeed.service.js';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startMonthlyAccessSeedJob(logger: Logger) {
  if (!config.authServiceUrl || !config.internalSecret) {
    logger.warn(
      { job: 'monthly-access-seed', reason: 'missing_auth_service_config' },
      'monthly access seed job disabled'
    );
    return null;
  }

  const intervalMs = Number(config.monthlyAccessSeedIntervalMs || DEFAULT_INTERVAL_MS);

  const run = async () => {
    try {
      const result = await seedDefaultMonthlyAccess();
      logger.info(
        {
          job: 'monthly-access-seed',
          processedUsers: result.processedUsers,
          anchorMonths: result.anchorMonths,
          recordsEnsured: result.recordsEnsured
        },
        'ensured default monthly access records'
      );
    } catch (error) {
      logger.error({ job: 'monthly-access-seed', err: (error as Error).message }, 'failed to seed monthly access defaults');
    }
  };

  run().catch((error) => {
    logger.error({ job: 'monthly-access-seed', err: (error as Error).message }, 'initial seed run failed');
  });

  const timer = setInterval(() => {
    run().catch((error) => {
      logger.error(
        { job: 'monthly-access-seed', err: (error as Error).message },
        'scheduled seed run failed'
      );
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}
