import redis from './redis';

const USER_LIMIT = parseInt(process.env.USER_LIMIT || '10');
const IP_LIMIT = parseInt(process.env.IP_LIMIT || '10');
const RATE_LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

// Redis key prefixes for different types of rate limits
const REDIS_KEY_PREFIX = {
  IP: 'ratelimit:ip:',
  USER: 'ratelimit:user:'
};

export class RateLimitError extends Error {
  resetTime?: Date;
  constructor(message: string, resetTime?: Date) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

export function getClientIP(req: Request): string | null {
  // Try different headers in order of reliability
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip',       // Nginx
    'x-forwarded-for', // Standard proxy header
    'x-client-ip',     // Apache
    'x-forwarded',     // Squid
    'forwarded-for',   // Standard
    'forwarded'        // Standard
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (x-forwarded-for can contain multiple IPs)
      const ips = value.split(',').map(ip => ip.trim());
      // Return the first valid IP
      for (const ip of ips) {
        if (isValidIP(ip)) {
          return ip;
        }
      }
    }
  }

  return null;
}

export async function checkRateLimit(ip: string, userId?: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  if (!isValidIP(ip)) {
    throw new RateLimitError('Invalid IP address', new Date(Date.now() + RATE_LIMIT_WINDOW * 1000));
  }

  try {
    // Check IP rate limit
    const ipKey = `${REDIS_KEY_PREFIX.IP}${ip}`;
    const ipCount = await redis.incr(ipKey);
    
    if (ipCount === 1) {
      await redis.expire(ipKey, RATE_LIMIT_WINDOW);
    }
    
    if (ipCount > IP_LIMIT) {
      const ttl = await redis.ttl(ipKey);
      const resetTime = new Date(Date.now() + ttl * 1000);
      throw new RateLimitError('IP rate limit exceeded', resetTime);
    }

    let userCount = 0;
    // If userId is provided, check user rate limit
    if (userId) {
      const userKey = `${REDIS_KEY_PREFIX.USER}${userId}`;
      userCount = await redis.incr(userKey);
      
      if (userCount === 1) {
        await redis.expire(userKey, RATE_LIMIT_WINDOW);
      }
      
      if (userCount > USER_LIMIT) {
        const ttl = await redis.ttl(userKey);
        const resetTime = new Date(Date.now() + ttl * 1000);
        throw new RateLimitError('User rate limit exceeded', resetTime);
      }
    }
    
    return { 
      allowed: true, 
      remaining: Math.min(IP_LIMIT - ipCount, userId ? USER_LIMIT - userCount : IP_LIMIT - ipCount),
      resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000)
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Re-throw specific rate limit errors (IP/User limit exceeded)
      throw error;
    }
    // Log the actual Redis error for debugging
    console.error('Redis error during rate limit check:', error);

    // If any other error occurs (assumed Redis connection issue),
    // treat it as a temporary restriction rather than a service failure.
    const estimatedResetTime = new Date(Date.now() + RATE_LIMIT_WINDOW * 1000);
    throw new RateLimitError('Rate limit check failed, please try again later.', estimatedResetTime);
  }
}

function isValidIP(ip: string): boolean {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) || 
         /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
} 