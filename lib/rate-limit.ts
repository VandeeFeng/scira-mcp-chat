import redis from './redis';

const MAX_REQUESTS_PER_DAY = 10;
const RATE_LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  if (!isValidIP(ip)) {
    return { allowed: false, remaining: 0, resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000) };
  }

  const key = `rate_limit:${ip}`;
  
  try {
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    
    if (count > MAX_REQUESTS_PER_DAY) {
      const ttl = await redis.ttl(key);
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: new Date(Date.now() + ttl * 1000)
      };
    }
    
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_DAY - count,
      resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000)
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_DAY,
      resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000)
    };
  }
}

function isValidIP(ip: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || 
         /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
} 