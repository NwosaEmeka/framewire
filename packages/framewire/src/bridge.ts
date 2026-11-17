import { FramewireError, type ErrorCode } from './errors';
import { PROTOCOL_VERSION, isFramewireMessage, type Message } from './protocol';
import type { BridgeOptions, DropReason, State } from './types';

/** How a bridge talks to its specific peer window. Supplied by host.ts / frame.ts. */
export interface Adapter {
  role: 'host' | 'frame';
  /** Where the first hello goes before the peer origin is known. */
  helloTarget: string;
  /** Returns a reason to drop the event, or undefined to accept it. */
  check(event: MessageEvent): DropReason | undefined;
  post(message: Message, targetOrigin: string): void;
  /** Optional extra wiring; receives a function that (re)sends hello. Returns teardown. */
  attach?(sayHello: () => void): () => void;
}

type Fn = (arg: unknown) => unknown;

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

/** Untyped core shared by host and frame. Public typing lives in types.ts. */
export interface CoreBridge {
  readonly ready: Promise<void>;
  readonly state: State;
  emit(name: string, data?: unknown): void;
  on(name: string, listener: Fn): () => void;
  handle(name: string, handler: Fn): () => void;
  request(name: string, arg?: unknown, options?: { timeout?: number }): Promise<unknown>;
  destroy(): void;
}

/** Internal view: no reserved-name guard, plus cleanup hooks for built-in features. */
export interface Core extends CoreBridge {
  onDestroy(cleanup: () => void): void;
}

export const noop = () => {};

const RESERVED = 'fw:';

const reserved = (name: string) =>
  name.startsWith(RESERVED)
    ? new FramewireError('RESERVED_NAME', `"${name}" uses the reserved "${RESERVED}" prefix`)
    : undefined;

const guard = (name: string) => {
  const error = reserved(name);
  if (error) throw error;
};

/** Wrap a core in the public API: reserved names are rejected, extras are mixed in. */
export function expose<T extends object>(core: Core, extras?: T): CoreBridge & T {
  const api: CoreBridge = {
    ready: core.ready,
    get state() {
      return core.state;
    },
    emit: (name, data) => (guard(name), core.emit(name, data)),
    on: (name, listener) => (guard(name), core.on(name, listener)),
    handle: (name, handler) => (guard(name), core.handle(name, handler)),
    request: (name, arg, options) => {
      const error = reserved(name);
      return error ? Promise.reject(error) : core.request(name, arg, options);
    },
    destroy: () => core.destroy(),
  };
  return Object.assign(api, extras);
}

const msg = (kind: Message['kind'], extra?: Omit<Message, 'framewire' | 'kind'>): Message => ({
  framewire: PROTOCOL_VERSION,
  kind,
  ...extra,
});

export function createBridge(win: Window, adapter: Adapter, options: BridgeOptions): Core {
  const defaultTimeout = options.timeout ?? 5000;
  const isHost = adapter.role === 'host';

  let state: State = 'connecting';
  let failure: FramewireError | undefined;
  let peerOrigin: string | undefined;
  let seq = 0;
  const queue: Message[] = [];
  const pending = new Map<string, Pending>();
  const handlers = new Map<string, Fn>();
  const listeners = new Map<string, Set<Fn>>();
  const cleanups: (() => void)[] = [];

  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Callers who never await `ready` should not see an unhandled rejection.
  ready.catch(noop);

  const send = (message: Message) => {
    if (state === 'ready') adapter.post(message, peerOrigin!);
    else if (state === 'connecting') queue.push(message);
  };

  const sayHello = (target = adapter.helloTarget) => adapter.post(msg('hello'), target);

  const becomeReady = (origin: string) => {
    if (state !== 'connecting') return;
    state = 'ready';
    peerOrigin = origin;
    clearTimeout(handshakeTimer);
    resolveReady();
    for (const message of queue.splice(0)) adapter.post(message, origin);
  };

  const fail = (code: ErrorCode, message: string) => {
    if (state === 'failed' || state === 'destroyed') return;
    failure = new FramewireError(code, message);
    state = code === 'DESTROYED' ? 'destroyed' : 'failed';
    clearTimeout(handshakeTimer);
    queue.length = 0;
    rejectReady(failure);
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(failure);
    }
    pending.clear();
  };

  const versionMismatch = (theirs: number) =>
    `Protocol mismatch: ${adapter.role} v${PROTOCOL_VERSION}, peer v${theirs}`;

  const reply = (id: string, data: unknown, error?: { code: ErrorCode; message: string }) => {
    try {
      send(msg('response', error ? { id, error } : { id, data }));
    } catch (cause) {
      // Usually a DataCloneError: the handler returned something postMessage can't copy.
      send(msg('response', { id, error: { code: 'REMOTE_ERROR', message: String(cause) } }));
    }
  };

  const onRequest = (id: string, name: string, data: unknown) => {
    const handler = handlers.get(name);
    if (!handler) {
      reply(id, undefined, { code: 'NO_HANDLER', message: `No handler for "${name}"` });
      return;
    }
    new Promise((resolve) => resolve(handler(data))).then(
      (result) => reply(id, result),
      (error: unknown) =>
        reply(id, undefined, {
          code: 'REMOTE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        }),
    );
  };

  const onResponse = (message: Message) => {
    const entry = pending.get(message.id!);
    if (!entry) return;
    pending.delete(message.id!);
    clearTimeout(entry.timer);
    if (message.error) {
      entry.reject(new FramewireError(message.error.code as ErrorCode, message.error.message));
    } else {
      entry.resolve(message.data);
    }
  };

  const onEvent = (name: string, data: unknown) => {
    for (const listener of listeners.get(name) ?? []) {
      try {
        listener(data);
      } catch (error) {
        // One bad listener must not stop the others; surface it asynchronously.
        setTimeout(() => {
          throw error;
        });
      }
    }
  };

  const onMessage = (event: MessageEvent) => {
    const message: unknown = event.data;
    if (!isFramewireMessage(message)) return;
    if (state === 'destroyed') return;

    const drop = (reason: DropReason) => options.onDrop?.(event, reason);
    const reason = adapter.check(event);
    if (reason) return drop(reason);
    if (state === 'ready' && event.origin !== peerOrigin) return drop('origin');

    const { kind } = message;

    if (kind === 'reject') {
      if (!isHost)
        fail('VERSION_MISMATCH', message.error?.message ?? versionMismatch(message.framewire));
      return;
    }
    if (kind === 'hello') {
      if (!isHost) {
        // Host-initiated hello (host loaded after us): answer with our own hello.
        if (state === 'connecting') sayHello(event.origin);
        return;
      }
      // A failed host stays failed; acking would leave the frame talking to nobody.
      if (state === 'failed') return;
      if (message.framewire !== PROTOCOL_VERSION) {
        const text = versionMismatch(message.framewire);
        adapter.post(
          msg('reject', { error: { code: 'VERSION_MISMATCH', message: text } }),
          event.origin,
        );
        fail('VERSION_MISMATCH', text);
        return;
      }
      // Re-ack when already ready: the frame may have reloaded.
      adapter.post(msg('ack'), event.origin);
      becomeReady(event.origin);
      return;
    }

    if (message.framewire !== PROTOCOL_VERSION) return drop('version');

    if (kind === 'ack') {
      if (!isHost) becomeReady(event.origin);
      return;
    }
    if (state !== 'ready') return drop('not-ready');

    if (kind === 'event') onEvent(message.name!, message.data);
    else if (kind === 'request') onRequest(message.id!, message.name!, message.data);
    else if (kind === 'response') onResponse(message);
  };

  const handshakeTimeout = options.handshakeTimeout ?? 10000;
  const handshakeTimer = setTimeout(
    () => fail('HANDSHAKE_TIMEOUT', `No handshake in ${handshakeTimeout}ms`),
    handshakeTimeout,
  );

  win.addEventListener('message', onMessage);
  const detach = adapter.attach?.(() => {
    if (state === 'connecting') sayHello();
  });
  sayHello();

  return {
    ready,
    get state() {
      return state;
    },

    emit(name, data) {
      send(msg('event', { name, data }));
    },

    on(name, listener) {
      const set = listeners.get(name) ?? new Set();
      listeners.set(name, set);
      set.add(listener);
      return () => void set.delete(listener);
    },

    handle(name, handler) {
      handlers.set(name, handler);
      return () => {
        if (handlers.get(name) === handler) handlers.delete(name);
      };
    },

    request(name, arg, requestOptions) {
      if (failure) return Promise.reject(failure);
      const id = String(++seq);
      const timeout = requestOptions?.timeout ?? defaultTimeout;
      const message = msg('request', { id, name, data: arg });
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          const queued = queue.indexOf(message);
          if (queued !== -1) queue.splice(queued, 1);
          reject(new FramewireError('TIMEOUT', `Request "${name}" timed out after ${timeout}ms`));
        }, timeout);
        pending.set(id, { resolve, reject, timer });
        send(message);
      });
    },

    onDestroy(cleanup) {
      cleanups.push(cleanup);
    },

    destroy() {
      if (state === 'destroyed') return;
      win.removeEventListener('message', onMessage);
      detach?.();
      for (const cleanup of cleanups.splice(0)) cleanup();
      if (state === 'failed') {
        state = 'destroyed';
        return;
      }
      fail('DESTROYED', 'Bridge was destroyed');
    },
  };
}
