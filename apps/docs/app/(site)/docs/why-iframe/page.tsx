import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Why an iframe' };

export default function WhyIframe() {
  return (
    <>
      <h1>Why an iframe?</h1>
      <p className="lead">
        If your frontend runs on other people&apos;s websites, you don&apos;t control the page. An
        iframe is the only boundary the browser actually enforces.
      </p>

      <h2>What breaks when you inject a widget</h2>
      <ul>
        <li>
          <strong>CSS.</strong> The host theme styles your buttons, fonts, images and box model.
          Your styles leak into theirs, too. Shadow DOM helps with selectors but not with inherited
          properties or global resets. <Link href="/demo">See the demo.</Link>
        </li>
        <li>
          <strong>JavaScript.</strong> You share globals, polyfills and prototypes with every other
          script on the page, and they share yours.
        </li>
        <li>
          <strong>Security.</strong> Anything you render, including tokens and personal data, is
          readable by every script on the host page.
        </li>
        <li>
          <strong>Policies.</strong> The host&apos;s CSP and cookie settings decide what your code
          may load and send.
        </li>
      </ul>

      <h2>What an iframe costs</h2>
      <p>The boundary is real, so everything across it becomes work:</p>
      <ul>
        <li>
          <strong>Talking.</strong> <code>postMessage</code> is untyped, fire-and-forget, and
          dangerous with the wrong <code>targetOrigin</code> or a missing origin check.
        </li>
        <li>
          <strong>Timing.</strong> Messages sent before the other side listens are lost.
        </li>
        <li>
          <strong>Sizing.</strong> An iframe doesn&apos;t grow with its content; you get double
          scrollbars.
        </li>
        <li>
          <strong>Leaving.</strong> Checkout pages and OAuth providers refuse to be framed.
        </li>
      </ul>

      <h2>How framewire pays those costs</h2>
      <table>
        <thead>
          <tr>
            <th>Cost</th>
            <th>framewire</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Untyped messages</td>
            <td>One shared contract type; events and requests are checked at compile time.</td>
          </tr>
          <tr>
            <td>Origin mistakes</td>
            <td>
              Exact origin + source checks, no wildcards, nothing sent to * after the handshake.
            </td>
          </tr>
          <tr>
            <td>Lost and hanging messages</td>
            <td>A handshake, a queue, and request timeouts with typed errors.</td>
          </tr>
          <tr>
            <td>Version drift</td>
            <td>A protocol version in every message; mismatches fail loudly.</td>
          </tr>
          <tr>
            <td>Sizing</td>
            <td>ResizeObserver in the frame, clamped height on the host.</td>
          </tr>
          <tr>
            <td>Leaving the frame</td>
            <td>navigateTop through the host, with state handed back on return.</td>
          </tr>
        </tbody>
      </table>

      <h2>When not to use an iframe</h2>
      <p>
        If you own both the page and the widget, ship one bundle. If you only need a link or a
        static badge, you don&apos;t need any of this.
      </p>
    </>
  );
}
