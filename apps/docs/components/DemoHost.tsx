'use client';

import { useCallback, useState } from 'react';
import { BookingCard } from './BookingCard';
import { WidgetFrame } from './WidgetFrame';
import styles from '@/app/(site)/demo/demo.module.css';

const USER = 'Ada';

export function DemoHost() {
  const [isolated, setIsolated] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [toast, setToast] = useState<string>();
  const [lines, setLines] = useState<string[]>([]);

  const log = useCallback(
    (line: string) => setLines((prev) => [...prev.slice(-11), `${time()}  ${line}`]),
    [],
  );
  const booked = useCallback((slot: string) => {
    setToast(`Booked ${slot}. The host page heard about it.`);
    setTimeout(() => setToast(undefined), 2500);
  }, []);

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={isolated}
            onChange={(e) => {
              setIsolated(e.target.checked);
              setLines([]);
            }}
          />
          Isolation {isolated ? 'on' : 'off'}
        </label>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          Theme: {theme}
        </button>
      </div>

      <div className={styles.stage}>
        <section className={`${styles.page} hostile`}>
          <p className={styles.pageNote}>
            A CMS page with an opinionated theme. Its CSS targets every <code>button</code>,{' '}
            <code>img</code> and <code>*</code> under it.
          </p>
          {isolated ? (
            <WidgetFrame theme={theme} user={USER} onBooked={booked} log={log} />
          ) : (
            <BookingCard user={USER} theme={theme} onBook={booked} />
          )}
        </section>

        <aside className={styles.log} aria-live="polite">
          <h2>Bridge log</h2>
          {isolated ? (
            lines.length ? (
              <ol>
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            ) : (
              <p>Waiting for the handshake…</p>
            )
          ) : (
            <p>
              No bridge: the widget is injected straight into the page and the page&apos;s CSS wins.
              Turn isolation on.
            </p>
          )}
        </aside>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

const time = () => new Date().toLocaleTimeString([], { hour12: false });
