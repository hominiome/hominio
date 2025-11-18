/**
 * Trusted origins utility
 * Centralized list of trusted origins for CORS and cookie sharing
 */

export function getTrustedOrigins(): string[] {
  const origins = [
    "https://hominio.me",
    "https://sync.hominio.me",
    "https://api.hominio.me",
    "https://wallet.hominio.me",
    "https://app.hominio.me",
  ];

  // Add localhost for development
  origins.push("http://localhost:4200");
  origins.push("http://localhost:4201");
  origins.push("http://localhost:4202");
  origins.push("http://localhost:4203");
  origins.push("http://localhost:4204");

  return origins;
}

export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return getTrustedOrigins().includes(origin);
}

