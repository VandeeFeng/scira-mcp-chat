import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || '';

// Construct the full Redis URL with password
const fullRedisUrl = `rediss://default:${redisPassword}@${redisUrl.split('@')[1]}`;

const redis = new Redis(fullRedisUrl);

export default redis; 