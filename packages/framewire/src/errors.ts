export type ErrorCode =
  | 'INVALID_ORIGIN'
  | 'HANDSHAKE_TIMEOUT'
  | 'VERSION_MISMATCH'
  | 'TIMEOUT'
  | 'NO_HANDLER'
  | 'REMOTE_ERROR'
  | 'DESTROYED';

export class FramewireError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'FramewireError';
    this.code = code;
  }
}
