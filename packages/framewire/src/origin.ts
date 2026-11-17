import { FramewireError } from './errors';

export type OriginPredicate = (origin: string) => boolean;
export type AllowedOrigins = string[] | OriginPredicate;

const invalid = (value: unknown, why: string) =>
  new FramewireError('INVALID_ORIGIN', `Invalid origin ${JSON.stringify(value)}: ${why}`);

/** Turns "https://a.com/path" into "https://a.com". Rejects wildcards and opaque origins. */
export function normalizeOrigin(value: string): string {
  if (value === '*') throw invalid(value, 'wildcard');
  let origin: string;
  try {
    origin = new URL(value).origin;
  } catch {
    throw invalid(value, 'not a URL');
  }
  if (origin === 'null') throw invalid(value, 'opaque origin');
  return origin;
}

export interface OriginMatcher {
  match: OriginPredicate;
  /** Set when exactly one concrete origin is allowed. */
  single?: string;
}

export function toMatcher(allowed: AllowedOrigins): OriginMatcher {
  if (typeof allowed === 'function') {
    return { match: (origin) => origin !== 'null' && allowed(origin) };
  }
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw invalid(allowed, 'need a non-empty list or a function');
  }
  const set = new Set(allowed.map(normalizeOrigin));
  const [first] = set;
  return { match: (origin) => set.has(origin), single: set.size === 1 ? first : undefined };
}
