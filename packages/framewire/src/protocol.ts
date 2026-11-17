/**
 * Wire protocol version. Bumped only on breaking changes to the message
 * format, independent of the npm package version.
 */
export const PROTOCOL_VERSION = 1;

export type Kind = 'hello' | 'ack' | 'reject' | 'event' | 'request' | 'response';

export interface WireError {
  code: string;
  message: string;
}

export interface Message {
  /** Marker and protocol version in one field. */
  framewire: number;
  kind: Kind;
  id?: string;
  name?: string;
  data?: unknown;
  error?: WireError;
}

export function isFramewireMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Message).framewire === 'number' &&
    typeof (value as Message).kind === 'string'
  );
}
