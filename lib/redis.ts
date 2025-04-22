import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisPassword = process.env.REDIS_PASSWORD || '';

// Construct the full Redis URL with password
const fullRedisUrl = `rediss://default:${redisPassword}@${redisUrl.split('@')[1]}`;

const redis = new Redis(fullRedisUrl, {
  maxRetriesPerRequest: 3, // Set max retries to 3
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); // Exponential backoff with max delay of 2s
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});

// Add error handling
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redis; 