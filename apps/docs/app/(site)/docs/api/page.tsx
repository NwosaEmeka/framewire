import type { Metadata } from 'next';
import { Code } from '@/components/Code';

export const metadata: Metadata = { title: 'API' };

const hostSig = `
createHost<C extends Contract>(options: {
  iframe: HTMLIFrameElement;
  origin: string;                       // exact origin of the iframe page
  resize?: boolean | { minHeight?: number; maxHeight?: number; onResize?(height: number): void };
  navigation?: boolean | ((url: URL) => boolean); // default false
  timeout?: number;                     // default request timeout, 5000 ms
  handshakeTimeout?: number;            // 10000 ms
  onDrop?(event: MessageEvent, reason: 'origin' | 'source' | 'version' | 'not-ready'): void;
}): HostBridge<C>
`;

const frameSig = `
createFrame<C extends Contract>(options: {
  allowedOrigins: string[] | ((origin: string) => boolean);
  resize?: boolean | { debounce?: number; measure?(): number };
  timeout?: number;
  handshakeTimeout?: number;
  onDrop?(event: MessageEvent, reason: DropReason): void;
}): FrameBridge<C>
`;

const bridgeSig = `
interface Bridge {
  readonly ready: Promise<void>;
  readonly state: 'connecting' | 'ready' | 'failed' | 'destroyed';
  emit(name, data?): void;                       // fire-and-forget, queued until ready
  on(name, listener): () => void;                // returns unsubscribe
  handle(name, handler): () => void;             // sync or async; returns unregister
  request(name, arg?, { timeout? }?): Promise<Result>;
  destroy(): void;                               // idempotent
}

// Frame bridges also have:
navigateTop(url: string | URL, { state? }?): Promise<void>;
returnUrl(): Promise<string>;
onResume<S>(listener: (state: S) => void): () => void;
`;

const errors = [
  ['INVALID_ORIGIN', "Thrown at creation: '*', 'null', an empty list or an unparseable origin."],
  [
    'HANDSHAKE_TIMEOUT',
    'No handshake within handshakeTimeout. ready rejects; queued requests reject.',
  ],
  ['VERSION_MISMATCH', 'The two sides speak different protocol versions. Both end up failed.'],
  [
    'TIMEOUT',
    'A request got no response in time. The clock starts at the call, including handshake wait.',
  ],
  ['NO_HANDLER', 'The other side has no handler for that method.'],
  [
    'REMOTE_ERROR',
    "The other side's handler threw or rejected. message is preserved, the stack is not.",
  ],
  ['DESTROYED', 'The bridge was destroyed while the call was pending, or before it was made.'],
  ['RESERVED_NAME', 'Names starting with fw: are reserved for built-in features.'],
  ['NAVIGATION_DENIED', 'The host did not opt in to navigation, or refused that URL.'],
];

export default function Api() {
  return (
    <>
      <h1>API</h1>
      <p className="lead">
        Everything is typed from one <code>Contract</code>. Errors are <code>FramewireError</code>{' '}
        instances with a <code>code</code>.
      </p>

      <h2>createHost</h2>
      <Code code={hostSig} />
      <p>
        One bridge per iframe. The host only accepts messages whose <code>origin</code> matches and
        whose <code>source</code> is that iframe&apos;s window.
      </p>

      <h2>createFrame</h2>
      <Code code={frameSig} />
      <p>
        With exactly one allowed origin, the first hello goes only to that origin. With several, or
        a predicate, the hello goes to <code>&apos;*&apos;</code>. It carries no data, and every
        later message goes only to the origin that answered. A predicate that returns{' '}
        <code>true</code> for everything turns origin checks off. Don&apos;t.
      </p>

      <h2>The bridge</h2>
      <Code code={bridgeSig} />

      <h2>Auto-resize</h2>
      <p>
        The frame observes <code>&lt;html&gt;</code> with <code>ResizeObserver</code> and sends its
        height (debounced, 50 ms; only when it changes). The host sets{' '}
        <code>iframe.style.height</code>, clamped to <code>minHeight</code>/<code>maxHeight</code>.
        Don&apos;t give <code>html</code> a fixed or <code>100%</code> height in the frame, or it
        can never shrink; pass <code>measure</code> if your layout needs something else.
      </p>

      <h2>navigateTop and resume</h2>
      <p>
        Payment pages and OAuth providers refuse to load in a frame, and browsers increasingly block
        frames from navigating the top window themselves. The frame asks; the host decides.
      </p>
      <ul>
        <li>
          Off unless the host passes <code>navigation: true</code> or a predicate. Only{' '}
          <code>http:</code>/<code>https:</code> URLs are ever followed.
        </li>
        <li>
          Before leaving, the host saves <code>state</code> in its <code>sessionStorage</code>. The
          next host bridge for the same frame origin, within 30 minutes, emits it once after the
          handshake, and the frame receives it in <code>onResume</code>.
        </li>
        <li>
          Use <code>returnUrl()</code> as the return URL you hand to the payment or OAuth provider.
        </li>
        <li>
          Resume state is readable by any script on the host page. Store an id, never a secret.
        </li>
      </ul>

      <h2>Errors</h2>
      <table>
        <thead>
          <tr>
            <th>code</th>
            <th>when</th>
          </tr>
        </thead>
        <tbody>
          {errors.map(([code, when]) => (
            <tr key={code}>
              <td>
                <code>{code}</code>
              </td>
              <td>{when}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Protocol</h2>
      <p>
        Every message is <code>{'{ framewire: 1, kind, id?, name?, data?, error? }'}</code>. The{' '}
        <code>framewire</code> field marks the message and carries the protocol version, which only
        changes on breaking wire changes, independent of the npm version. The frame sends{' '}
        <code>hello</code>; the host answers <code>ack</code>, or <code>reject</code> on a version
        mismatch. If the host loads late, it greets the frame and the frame says hello again.
      </p>
    </>
  );
}
