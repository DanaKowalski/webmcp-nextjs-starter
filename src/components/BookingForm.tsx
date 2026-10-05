'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { DROP_OFF, FIELD_LIMITS, SERVICES, TOWNS } from '@/lib/shop';
import { registerFiller, type BookingPrefill } from '@/lib/formBridge';

const EMPTY: BookingPrefill = { name: '', email: '', town: '', service: '', notes: '' };

/* Replace with a POST to your own endpoint. */
async function sendBooking(booking: BookingPrefill): Promise<void> {
  void booking;
}

export default function BookingForm({
  send = sendBooking,
}: {
  send?: (booking: BookingPrefill) => Promise<void>;
}) {
  const [values, setValues] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /* This is what `start_booking` reaches. Controlled state, so the tool has
     to come in through React. */
  useEffect(
    () =>
      registerFiller((incoming) => {
        setValues({ ...EMPTY, ...incoming });
        setSent(false);
        const el = formRef.current;
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({
          top: window.scrollY + el.getBoundingClientRect().top - 24,
          behavior: reduce ? 'instant' : 'smooth',
        });
      }),
    [],
  );

  const set =
    (field: keyof BookingPrefill) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await send(values);
    setSent(true);
  };

  return (
    <div className="card" id="booking">
      <h2>Book a service</h2>
      <p className="small muted">
        Fill this in yourself, or call <code>start_booking</code> from the
        console and watch it fill.
      </p>

      <form ref={formRef} onSubmit={onSubmit}>
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" value={values.name} onChange={set('name')} maxLength={FIELD_LIMITS.name} required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={values.email} onChange={set('email')} maxLength={FIELD_LIMITS.email} required />

        <label htmlFor="town">Town</label>
        <select id="town" name="town" value={values.town} onChange={set('town')} required>
          <option value="">Pick a town</option>
          {TOWNS.map((town) => (
            <option key={town} value={town}>{town}</option>
          ))}
          <option value={DROP_OFF.value}>{DROP_OFF.label}</option>
        </select>

        <label htmlFor="service">Service</label>
        <select id="service" name="service" value={values.service} onChange={set('service')} required>
          <option value="">Pick a service</option>
          {SERVICES.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>

        <label htmlFor="notes">What is wrong with the bike?</label>
        <textarea id="notes" name="notes" rows={3} value={values.notes} onChange={set('notes')} maxLength={FIELD_LIMITS.notes} />

        <button type="submit">Send request</button>

        {sent && <p className="sent">Request sent.</p>}
      </form>
    </div>
  );
}
