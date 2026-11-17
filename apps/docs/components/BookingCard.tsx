'use client';

import { useState } from 'react';
import styles from './BookingCard.module.css';

const SLOTS = ['09:00', '12:30', '16:00'];

const AVATAR =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#4f46e5"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="#fff" font-family="sans-serif">FW</text></svg>',
  );

export interface BookingCardProps {
  user?: string;
  theme?: 'light' | 'dark';
  onBook?: (slot: string) => void;
}

/** A small third-party-style widget: the thing that gets embedded. */
export function BookingCard({ user, theme = 'light', onBook }: BookingCardProps) {
  const [slot, setSlot] = useState<string>();
  return (
    <div className={styles.card} data-theme={theme}>
      <div className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG, nothing to optimise */}
        <img className={styles.avatar} src={AVATAR} alt="" />
        <div>
          <h3 className={styles.title}>Book a call</h3>
          <p className={styles.sub}>{user ? `Hi ${user}, pick a time` : 'Pick a time'}</p>
        </div>
      </div>
      <div className={styles.slots}>
        {SLOTS.map((time) => (
          <button
            key={time}
            type="button"
            className={styles.slot}
            aria-pressed={slot === time}
            onClick={() => setSlot(slot === time ? undefined : time)}
          >
            {time}
          </button>
        ))}
      </div>
      {slot && (
        <p className={styles.details}>
          30-minute video call at {slot}. You will get a calendar invite and a reminder an hour
          before. Reschedule any time from the link in the email.
        </p>
      )}
      <button
        type="button"
        className={styles.book}
        disabled={!slot}
        onClick={() => slot && onBook?.(slot)}
      >
        Book {slot ?? ''}
      </button>
    </div>
  );
}
