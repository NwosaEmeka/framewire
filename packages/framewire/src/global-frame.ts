/**
 * Frame script-tag build (dist/framewire.frame.global.js) for pages without a
 * bundler: adds `createFrame` to `window.framewire`.
 */
import { FramewireError } from './errors';
import { createFrame } from './frame';
import { PROTOCOL_VERSION } from './protocol';

const w = window as { framewire?: Record<string, unknown> };
Object.assign((w.framewire ??= {}), { createFrame, FramewireError, PROTOCOL_VERSION });
