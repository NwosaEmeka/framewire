import type { Metadata } from 'next';
import { DemoHost } from '@/components/DemoHost';
import './hostile.css';

export const metadata: Metadata = { title: 'Demo: your CSS is not my CSS' };

export default function DemoPage() {
  return (
    <>
      <h1>Your CSS is not my CSS</h1>
      <p className="lead">
        The same booking widget, twice. Injected into the page, it inherits the page&apos;s theme
        and breaks. Inside a framewire iframe, it keeps its own styles and still talks to the page.
      </p>
      <DemoHost />
      <p>
        With isolation on, the log shows the bridge at work: the handshake, the page pushing a{' '}
        <code>theme</code> event, the widget requesting <code>getUser</code>, the iframe resizing
        when you pick a slot, and a <code>booked</code> event when you book. This demo runs on one
        origin; the cross-origin case is covered by the{' '}
        <a href="https://github.com/NwosaEmeka/framewire/tree/main/e2e">e2e tests</a>.
      </p>
    </>
  );
}
