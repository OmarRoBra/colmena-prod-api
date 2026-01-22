import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import logger from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  includeUserId?: boolean;
  includeQueryParams?: boolean;
}

export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 600,
  VERY_LONG: 1800,
  HOUR: 3600,
} as const;

export const cache = (options: CacheMiddlewareOptions = {}) => {
  const {
    ttl = CacheTTL.MEDIUM,
    keyGenerator,
    condition,
    includeUserId = true,
    includeQueryParams = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (condition && !condition(req)) {
      return next();
    }

    if (!cacheService.isAvailable()) {
      return next();
    }

    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : cacheService.generateKey({
          path: req.baseUrl + req.path,
          query: includeQueryParams ? (req.query as Record<string, unknown>) : undefined,
          userId: includeUserId ? req.user?.userId : undefined,
        });

    try {
      const cachedResponse = await cacheService.get<{
        statusCode: number;
        body: unknown;
      }>(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        return res.status(cachedResponse.statusCode).json(cachedResponse.body);
      }

      logger.debug(`Cache MISS: ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cacheData = {
            statusCode: res.statusCode,
            body,
          };

          cacheService.set(cacheKey, cacheData, ttl).catch((error) => {
            logger.error('Failed to cache response:', error);
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

export const invalidateCache = (resourcePatterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Promise.all(
          resourcePatterns.map((pattern) => cacheService.deletePattern(pattern))
        ).catch((error) => {
          logger.error('Failed to invalidate cache:', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

export const clearResourceCache = async (
  resourceType: string,
  resourceId?: string
): Promise<void> => {
  await cacheService.invalidateResource(resourceType, resourceId);
};
