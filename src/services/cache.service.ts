import Redis from 'ioredis';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0 };
  private readonly keyPrefix: string;
  private readonly defaultTTL: number;
  private readonly enabled: boolean;

  constructor() {
    this.keyPrefix = config.redis.cache?.keyPrefix || 'colmena:cache:';
    this.defaultTTL = config.redis.cache?.defaultTTL || 300;
    this.enabled = config.redis.cache?.enabled !== false;
  }

  async initialize(): Promise<void> {
    if (!this.enabled) {
      logger.info('Redis cache is disabled');
      return;
    }

    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 retries, cache will be disabled');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        logger.info('Redis cache connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis cache error:', error);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.client.on('close', () => {
        logger.warn('Redis cache connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis cache reconnecting...');
      });

      await this.client.connect();
      await this.client.ping();
      this.isConnected = true;
      logger.info('Redis cache initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize Redis cache, operating without cache:', error);
      this.isConnected = false;
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return this.enabled && this.isConnected && this.client !== null;
  }

  generateKey(components: {
    path: string;
    query?: Record<string, unknown>;
    userId?: string;
  }): string {
    const { path, query, userId } = components;

    const sortedQuery =
      query && Object.keys(query).length > 0
        ? ':' +
          Object.keys(query)
            .sort()
            .map((k) => `${k}=${query[k]}`)
            .join('&')
        : '';

    const userPart = userId ? `:user:${userId}` : '';

    return `${this.keyPrefix}${path}${sortedQuery}${userPart}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const data = await this.client!.get(key);
      if (data) {
        this.stats.hits++;
        return JSON.parse(data) as T;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const ttl = ttlSeconds || this.defaultTTL;
      const serialized = JSON.stringify(value);
      await this.client!.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const fullPattern = `${this.keyPrefix}${pattern}`;
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.client!.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client!.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} cache keys matching pattern: ${pattern}`);
      }
      return deletedCount;
    } catch (error) {
      logger.error('Cache deletePattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  async invalidateResource(resourceType: string, resourceId?: string): Promise<number> {
    const pattern = resourceId ? `*${resourceType}*${resourceId}*` : `*${resourceType}*`;
    return this.deletePattern(pattern);
  }

  async flush(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return (await this.deletePattern('*')) > 0;
    } catch (error) {
      logger.error('Cache flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  getStats(): CacheStats & { connected: boolean; enabled: boolean } {
    return {
      ...this.stats,
      connected: this.isConnected,
      enabled: this.enabled,
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    message: string;
  }> {
    if (!this.enabled) {
      return { status: 'degraded', message: 'Cache is disabled' };
    }

    if (!this.isAvailable()) {
      return { status: 'degraded', message: 'Cache is not connected' };
    }

    try {
      const start = Date.now();
      await this.client!.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
        message: `Redis responding (${latency}ms)`,
      };
    } catch (error) {
      return { status: 'unhealthy', message: `Redis error: ${error}` };
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis cache connection closed gracefully');
      } catch (error) {
        logger.error('Error closing Redis cache connection:', error);
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const cacheService = new CacheService();
