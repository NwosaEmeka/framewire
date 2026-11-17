import type { Metadata } from 'next';
import { Code } from '@/components/Code';
import { site } from '@/lib/site';

export const metadata: Metadata = { title: 'Quick start' };

const contract = `
// contract.ts: shared by both sides
export type App = {
  host: {
    events: { theme: 'light' | 'dark' };            // host → frame
    methods: { getUser: () => { name: string } };   // frame calls, host answers
  };
  frame: {
    events: { booked: { slot: string } };           // frame → host
    methods: {};
  };
};
`;

const host = `
// On the page that embeds the widget
import { createHost } from 'framewire';
import type { App } from './contract';

const iframe = document.querySelector('iframe')!;
const bridge = createHost<App>({
  iframe,
  origin: 'https://widget.example.com', // exact origin of the iframe page
  resize: { maxHeight: 900 },           // let the widget size its iframe
});

bridge.handle('getUser', () => ({ name: 'Ada' }));
bridge.on('booked', ({ slot }) => console.log('booked', slot));
bridge.emit('theme', 'dark'); // queued until the handshake completes
`;

const frame = `
// Inside the iframe (the widget)
import { createFrame } from 'framewire';
import type { App } from './contract';

const bridge = createFrame<App>({
  allowedOrigins: ['https://shop.example.com'], // who may embed you
  resize: true,
});

bridge.on('theme', (mode) => document.documentElement.dataset.theme = mode);
const user = await bridge.request('getUser'); // typed: { name: string }
bridge.emit('booked', { slot: '09:00' });
`;

const scriptTag = `
<!-- Host page with no build step (Wix, Webflow, WordPress) -->
<script
  src="${site.cdn}/dist/framewire.global.js"
  data-src="https://widget.example.com/book"
  data-max-height="900"
></script>
`;

const scriptFrame = `
<!-- The widget page, if it has no bundler either -->
<script src="${site.cdn}/dist/framewire.frame.global.js"></script>
<script>
  const bridge = framewire.createFrame({
    allowedOrigins: ['https://shop.example.com'],
    resize: true,
  });
</script>
`;

export default function QuickStart() {
  return (
    <>
      <h1>Quick start</h1>
      <p className="lead">Two pages, one contract, five minutes.</p>

      <h2>1. Install</h2>
      <Code lang="bash" code="npm i framewire" />

      <h2>2. Describe the conversation</h2>
      <p>
        One type, imported by both sides. Declare it with <code>type</code>, not{' '}
        <code>interface</code>.
      </p>
      <Code code={contract} />

      <h2>3. Host page</h2>
      <Code code={host} />

      <h2>4. Inside the iframe</h2>
      <Code code={frame} />
      <p className="callout">
        Both sides must name each other&apos;s exact origin. Messages from anywhere else are dropped
        silently. If the two never connect, check the origins first; the <code>onDrop</code> option
        tells you why each message was dropped.
      </p>

      <h2>No bundler?</h2>
      <p>One tag mounts the iframe after itself and wires the bridge:</p>
      <Code lang="html" code={scriptTag} />
      <p>
        The bridge is on <code>window.framewire.bridges</code> and in the{' '}
        <code>framewire:ready</code> event on the iframe. Add{' '}
        <code>data-navigation=&quot;true&quot;</code> to allow <code>navigateTop</code>, and{' '}
        <code>data-allow=&quot;payment&quot;</code> to pass iframe permissions.
      </p>
      <Code lang="html" code={scriptFrame} />
    </>
  );
}
