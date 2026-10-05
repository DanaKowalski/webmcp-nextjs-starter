// src/lib/formBridge.ts

/* Lets a tool put values into a React form without the tools module
   importing React or the form importing WebMCP.
 *
 * You need something like this whenever the form is controlled, or is not
 * mounted when the agent arrives. Chrome's declarative API fills a plain
 * `<form>` for you, but it can only reach real DOM inputs that exist at the
 * time, which rules out a form behind a toggle, and rules out any control
 * that is a styled button with its options in a portal rather than a native
 * `<select>`.
 *
 * Module state, so this is only ever correct on the client. */

export interface BookingPrefill {
  name: string;
  email: string;
  town: string;
  service: string;
  notes: string;
}

type Filler = (values: BookingPrefill) => void;

let filler: Filler | null = null;
let pending: BookingPrefill | null = null;

const flush = () => {
  if (!filler || !pending) return;
  const values = pending;
  /* Cleared before the call, not after. A filler that throws should not leave
     the values queued to be applied again on the next mount. */
  pending = null;
  filler(values);
};

/** Called by the form on mount. Returns an unsubscribe for the effect. */
export const registerFiller = (fill: Filler) => {
  filler = fill;
  /* Values may already be waiting if the tool ran before the form mounted,
     which is the normal case when the form is lazy or behind a toggle. */
  flush();
  return () => {
    if (filler === fill) filler = null;
  };
};

/**
 * Fills the booking form. Returns false when no form is listening, which the
 * caller is expected to say out loud rather than report a success that
 * nobody can see on screen. The values stay queued either way, and fill the
 * form if it mounts later, so the caller should say that too.
 */
export const requestPrefill = (values: BookingPrefill) => {
  pending = values;
  if (!filler) return false;
  flush();
  return true;
};
