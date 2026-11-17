import Link from 'next/link';
import { Code } from '@/components/Code';
import { site, sizes } from '@/lib/site';

const usage = `
// host page
const bridge = createHost<App>({ iframe, origin: 'https://widget.example.com', resize: true });
bridge.handle('getUser', () => currentUser);
bridge.on('booked', ({ slot }) => toast(\`Booked \${slot}\`));

// inside the iframe
const bridge = createFrame<App>({ allowedOrigins: ['https://shop.example.com'], resize: true });
const user = await bridge.request('getUser');
bridge.emit('booked', { slot: '09:00' });
`;

export default function Home() {
  return (
    <>
      <h1>Frontends that run inside other people&apos;s websites.</h1>
      <p className="lead">
        {site.tagline} Typed events and requests, a versioned handshake, strict origin checks,
        auto-resize and a way out of the frame for payments and OAuth, in under 3 KB.
      </p>
      <div className="cta">
        <Link className="button" href="/docs/quick-start">
          Quick start
        </Link>
        <Link className="button secondary" href="/demo">
          See the demo
        </Link>
      </div>

      <Code lang="bash" code="npm i framewire" />
      <Code code={usage} />

      <h2>What you get</h2>
      <ul>
        <li>
          <strong>One contract, both sides typed.</strong> Rename an event and the compiler tells
          you where.
        </li>
        <li>
          <strong>Safe by default.</strong> Exact origin + source checks, no{' '}
          <code>&apos;*&apos;</code> after the handshake, wildcards rejected.
        </li>
        <li>
          <strong>No lost messages.</strong> Calls made before the handshake are queued; requests
          time out instead of hanging.
        </li>
        <li>
          <strong>Auto-resize.</strong> The frame reports its height; the host applies it.
        </li>
        <li>
          <strong>navigateTop + resume.</strong> For checkout and OAuth pages that refuse to run in
          a frame.
        </li>
        <li>
          <strong>One script tag</strong> for Wix, Webflow and WordPress.
        </li>
      </ul>

      <h2>Size</h2>
      <table>
        <thead>
          <tr>
            <th>Entry</th>
            <th>min + gzip</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((s) => (
            <tr key={s.entry}>
              <td>
                <code>{s.entry}</code>
              </td>
              <td>{s.kb} KB</td>
              <td>{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>CI fails the build if any entry goes over 3 KB.</p>
    </>
  );
}
