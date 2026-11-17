/* eslint-disable @typescript-eslint/no-explicit-any */

/** Event name → payload type. */
export type Events = Record<string, unknown>;
/** Method name → function signature (zero or one argument). */
export type Methods = Record<string, (arg: any) => unknown>;

/** What one side emits and implements. */
export interface Side {
  events: Events;
  methods: Methods;
}

/**
 * The shared contract between host and frame. Declare it with `type`, not
 * `interface`, so it satisfies the index signatures.
 *
 * - `host.events`: events the host emits, the frame listens to.
 * - `host.methods`: methods the host implements, the frame requests.
 * - `frame.*`: the mirror image.
 */
export interface Contract {
  host: Side;
  frame: Side;
}

export interface AnyContract extends Contract {
  host: { events: Events; methods: Methods };
  frame: { events: Events; methods: Methods };
}

export type State = 'connecting' | 'ready' | 'failed' | 'destroyed';
export type DropReason = 'origin' | 'source' | 'version' | 'not-ready';

export interface RequestOptions {
  /** Milliseconds before the request rejects with `TIMEOUT`. */
  timeout?: number;
}

export interface BridgeOptions {
  /** Default request timeout in ms. Default 5000. */
  timeout?: number;
  /** Ms to wait for the handshake before `ready` rejects. Default 10000. */
  handshakeTimeout?: number;
  /** Called when a framewire message is dropped. Useful for debugging. */
  onDrop?: (event: MessageEvent, reason: DropReason) => void;
}

export type MethodArg<F> = F extends (...args: infer P) => unknown
  ? P extends []
    ? undefined
    : P[0]
  : never;

export type MethodResult<F> = F extends (...args: any[]) => infer R ? Awaited<R> : never;

type EmitArgs<T> = undefined extends T ? [data?: T] : [data: T];

type RequestArgs<F> =
  MethodArg<F> extends undefined
    ? [arg?: MethodArg<F>, options?: RequestOptions]
    : [arg: MethodArg<F>, options?: RequestOptions];

export interface Bridge<Self extends Side, Peer extends Side> {
  /** Resolves after the handshake; rejects on timeout, version mismatch or destroy. */
  readonly ready: Promise<void>;
  readonly state: State;
  /** Fire-and-forget event to the other side. Queued until ready. */
  emit<K extends keyof Self['events'] & string>(
    name: K,
    ...args: EmitArgs<Self['events'][K]>
  ): void;
  /** Listen to an event from the other side. Returns an unsubscribe function. */
  on<K extends keyof Peer['events'] & string>(
    name: K,
    listener: (data: Peer['events'][K]) => void,
  ): () => void;
  /** Implement a method the other side can request. Returns an unregister function. */
  handle<K extends keyof Self['methods'] & string>(
    name: K,
    handler: (
      arg: MethodArg<Self['methods'][K]>,
    ) => MethodResult<Self['methods'][K]> | Promise<MethodResult<Self['methods'][K]>>,
  ): () => void;
  /** Call a method on the other side. Queued until ready; the timeout starts now. */
  request<K extends keyof Peer['methods'] & string>(
    name: K,
    ...args: RequestArgs<Peer['methods'][K]>
  ): Promise<MethodResult<Peer['methods'][K]>>;
  /** Remove listeners and reject pending requests with `DESTROYED`. Idempotent. */
  destroy(): void;
}

export type HostBridge<C extends Contract = AnyContract> = Bridge<C['host'], C['frame']>;
export type FrameBridge<C extends Contract = AnyContract> = Bridge<C['frame'], C['host']>;
