import { Redis } from '@upstash/redis';

// Автоматически берет переменные UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN,
// созданные при интеграции в Vercel
export const redis = Redis.fromEnv();
