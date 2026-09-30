export const DEFAULT_ALLOWED_ORIGINS = [
  "https://designanywhere.org",
  "https://www.designanywhere.org",
];

export const LOCAL_DEV_ORIGIN = "http://localhost:5173";

export type LeadEnv = Record<string, string | undefined>;

export function allowedOrigins(env: LeadEnv): string[] {
  const raw = env.CONTACT_ALLOWED_ORIGIN;
  const configured =
    raw == null || raw.trim() === ""
      ? [...DEFAULT_ALLOWED_ORIGINS]
      : raw.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (env.NODE_ENV !== "production" && !configured.includes(LOCAL_DEV_ORIGIN)) {
    configured.push(LOCAL_DEV_ORIGIN);
  }
  return configured;
}

export function isOriginAllowed(origin: string, env: LeadEnv): boolean {
  return allowedOrigins(env).includes(origin);
}

export function corsHeaders(origin: string | null, env: LeadEnv): Headers | null {
  if (!origin || !isOriginAllowed(origin, env)) return null;
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
