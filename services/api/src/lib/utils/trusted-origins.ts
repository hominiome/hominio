/**
 * Trusted origins utility
 * Centralized list of trusted origins for CORS and cookie sharing
 * Uses environment variables for production domains
 */

function getDomainUrl(domain: string): string {
  // If domain already has protocol, return as-is
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  
  // Check if it's localhost (development)
  if (domain.startsWith('localhost') || domain.startsWith('127.0.0.1')) {
    return `http://${domain}`;
  }
  
  // Production domains use HTTPS
  return `https://${domain}`;
}

export function getTrustedOrigins(): string[] {
  const origins: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Add production domains from environment variables
  const rootDomain = process.env.PUBLIC_DOMAIN_ROOT;
  const appDomain = process.env.PUBLIC_DOMAIN_APP;
  const walletDomain = process.env.PUBLIC_DOMAIN_WALLET;
  const syncDomain = process.env.PUBLIC_DOMAIN_SYNC;
  const apiDomain = process.env.PUBLIC_DOMAIN_API;

  // Add domains from env vars if set
  if (rootDomain) {
    origins.push(getDomainUrl(rootDomain));
  } else if (isProduction) {
    // Production fallback
    origins.push('https://hominio.me');
  }

  if (appDomain) {
    origins.push(getDomainUrl(appDomain));
  } else if (isProduction) {
    origins.push('https://app.hominio.me');
  }

  if (walletDomain) {
    origins.push(getDomainUrl(walletDomain));
  } else if (isProduction) {
    origins.push('https://wallet.hominio.me');
  }

  if (syncDomain) {
    origins.push(getDomainUrl(syncDomain));
  } else if (isProduction) {
    origins.push('https://sync.hominio.me');
  }

  if (apiDomain) {
    origins.push(getDomainUrl(apiDomain));
  } else if (isProduction) {
    origins.push('https://api.hominio.me');
  }

  // Add localhost for development (always include for local testing)
  if (!isProduction) {
    origins.push("http://localhost:4200");
    origins.push("http://localhost:4201");
    origins.push("http://localhost:4202");
    origins.push("http://localhost:4203");
    origins.push("http://localhost:4204");
  }

  return origins;
}

export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return getTrustedOrigins().includes(origin);
}

