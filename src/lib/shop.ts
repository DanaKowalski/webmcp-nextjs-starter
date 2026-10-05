// src/lib/shop.ts

/* The business data. One file, read by both the page and the tools, so a
   price cannot say one thing on screen and another to an agent. */

export const SHOP = {
  name: 'Northwind Bikes',
  tagline: 'Bicycle service and repair.',
  turnaround: 'Most work is done same week. Full rebuilds take two weeks.',
} as const;

export const SERVICES = [
  {
    id: 'tune-up',
    name: 'Tune-up',
    price: 75,
    summary: 'Gears, brakes, tyre pressure and a safety check.',
  },
  {
    id: 'brake-service',
    name: 'Brake service',
    price: 60,
    summary: 'New pads, cables and a full bleed on hydraulics.',
  },
  {
    id: 'wheel-build',
    name: 'Wheel build',
    price: 180,
    summary: 'Hand-built and tensioned, rim and spokes not included.',
  },
  {
    id: 'full-rebuild',
    name: 'Full rebuild',
    price: 420,
    summary: 'Stripped to the frame, every bearing replaced.',
  },
] as const;

export type Service = (typeof SERVICES)[number];

export const SERVICE_IDS = SERVICES.map((service) => service.id);

export const TOWNS = [
  'Ashfield',
  'Bramley',
  'Coldwater',
  'Dunmore',
  'Eastgate',
] as const;

/* Collection is a flat fee, and only inside the towns above. */
export const COLLECTION_FEE = 15;

/* The booking form's choice for anyone outside the collection towns, since
   drop-off is welcome from anywhere. */
export const DROP_OFF = { value: 'elsewhere', label: 'Somewhere else (drop-off)' } as const;

/* Longest value the booking form and `start_booking` accept per field. */
export const FIELD_LIMITS = {
  name: 100,
  email: 254,
  town: 100,
  notes: 1000,
} as const;

/* The listed spelling of a town, or undefined. The form's dropdown only
   matches its own option values, so "bramley" has to become "Bramley". */
export const canonicalTown = (town: string) =>
  TOWNS.find((known) => known.toLowerCase() === town.trim().toLowerCase());

export const findService = (id: string): Service | undefined =>
  SERVICES.find((service) => service.id === id);

export const quoteTotal = (service: Service, collection: boolean) =>
  service.price + (collection ? COLLECTION_FEE : 0);

/* "A, B and C", for prose. */
export const listInWords = (items: readonly string[]) =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
