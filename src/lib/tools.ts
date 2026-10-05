// src/lib/tools.ts

/* The tools this site hands to an agent.
 *
 * Chrome's guidance caps a tool description at 500 characters, a parameter
 * description at 150, and any single tool output at 1.5K, past which clients
 * start applying their own guardrails. tools.test.ts checks those budgets.
 *
 * Write descriptions for a reader who cannot see your page. "Use this when
 * someone asks X" beats a restatement of the function name, because the agent
 * is deciding which tool to call, not what a tool does once called. */

import {
  COLLECTION_FEE,
  DROP_OFF,
  FIELD_LIMITS,
  SERVICES,
  SERVICE_IDS,
  SHOP,
  TOWNS,
  canonicalTown,
  findService,
  quoteTotal,
} from '@/lib/shop';
import { requestPrefill, type BookingPrefill } from '@/lib/formBridge';

/** A tool result from lines of text. `null` and `false` lines are dropped,
    so a line can be included conditionally. An empty string is a blank line,
    and repeated blank lines collapse. */
export const reply = (...lines: (string | null | false)[]): WebMCP.ToolResult => ({
  content: [
    {
      type: 'text',
      text: lines
        .filter((line) => line !== null && line !== false)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    },
  ],
});

const SERVICE_LIST = SERVICE_IDS.join(', ');
const TOWN_LIST = TOWNS.join(', ');

/* An enum rather than a free string. The agent gets the valid set in the
   schema, so it does not have to guess from the page. */
const serviceProperty = (description: string) => ({
  type: 'string',
  enum: SERVICE_IDS,
  description,
});

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TOOLS: WebMCP.Tool[] = [
  {
    name: 'get_services',
    title: 'Services and prices',
    description: `Everything ${SHOP.name} offers, with the price and a one-line summary of each. Use this when someone asks what the shop does, what something costs, or whether a particular job is handled here.`,
    annotations: { readOnlyHint: true },
    execute: () =>
      reply(
        `${SHOP.name}: ${SHOP.tagline}`,
        '',
        ...SERVICES.map((s) => `${s.name}, $${s.price}: ${s.summary}`),
        '',
        SHOP.turnaround,
      ),
  },

  {
    name: 'get_quote',
    title: 'Price a job',
    description:
      'Adds up a job from a service and an optional collection. Use this once someone has said what they need done, rather than quoting from the price list yourself, so the total and any collection fee come out of one place. Collection only covers some towns, so check theirs with check_service_area before asking for it here.',
    inputSchema: {
      type: 'object',
      properties: {
        service: serviceProperty('Which service to price.'),
        collection: {
          type: 'boolean',
          description:
            'True if the bike needs collecting rather than dropping off. Adds a flat fee.',
        },
      },
      required: ['service'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const service = findService(asText(input.service));

      /* Say what is wrong. An agent given "that failed" retries the same
         call; an agent given the valid list fixes it. */
      if (!service) return reply(`Pick a service from: ${SERVICE_LIST}.`);

      const collection = input.collection === true;
      return reply(
        `${service.name}: $${service.price}.`,
        collection && `Collection: $${COLLECTION_FEE}.`,
        `Total: $${quoteTotal(service, collection)}.`,
        '',
        SHOP.turnaround,
        'This is a price, not a booking. Nothing is reserved.',
      );
    },
  },

  {
    name: 'check_service_area',
    title: 'Check a town',
    description: `Whether ${SHOP.name} collects from a given town. Use this when someone names where they are and wants to know if collection is an option.`,
    inputSchema: {
      type: 'object',
      properties: {
        town: { type: 'string', description: 'The town to check, in plain words.' },
      },
      required: ['town'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const town = asText(input.town);

      /* The caller's words are matched but never echoed back, so the output
         only ever contains text this site wrote. */
      if (!town) return reply(`Name a town. Collection covers: ${TOWN_LIST}.`);

      return canonicalTown(town)
        ? reply(`Yes, that town is covered. Collection is $${COLLECTION_FEE}.`)
        : reply(
            'That town is outside the collection area, but drop-off is welcome from anywhere.',
            '',
            `Collection covers: ${TOWN_LIST}.`,
          );
    },
  },

  {
    name: 'start_booking',
    title: 'Fill in the booking form',
    description:
      'Types someone’s details into the booking form on the page so they can send it. It fills the form and stops there: the person reads it and presses the button themselves, and nothing is sent until they do. Use it once someone has said they want to book and has given their own details. Never invent values to fill it with.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: FIELD_LIMITS.name, description: 'The name they gave, as they gave it.' },
        email: { type: 'string', maxLength: FIELD_LIMITS.email, description: 'Their email address.' },
        town: { type: 'string', maxLength: FIELD_LIMITS.town, description: 'The town they are in.' },
        service: serviceProperty('Which service they want.'),
        notes: {
          type: 'string',
          maxLength: FIELD_LIMITS.notes,
          description: 'What is wrong with the bike, in their own words.',
        },
      },
      required: ['name', 'email', 'town', 'service'],
    },
    /* Not read-only: it puts words on the visitor's screen under the shop's
       name, even though nothing leaves the browser. */
    annotations: { readOnlyHint: false },
    execute: (input) => {
      const values: BookingPrefill = {
        name: asText(input.name),
        email: asText(input.email),
        town: asText(input.town),
        service: asText(input.service),
        notes: asText(input.notes),
      };

      /* The town dropdown only matches its own option values. Anywhere not
         listed is a drop-off, and the town they gave goes at the front of the
         notes so the shop still learns where they are. That prefix counts
         against the notes limit, so it is worked out before validating. */
      const listedTown = canonicalTown(values.town);
      const townPrefix = values.town && !listedTown ? `Town: ${values.town}. ` : '';
      const limits = { ...FIELD_LIMITS, notes: FIELD_LIMITS.notes - townPrefix.length };

      const problems: string[] = [];
      if (!values.name) problems.push('a name');
      if (!EMAIL.test(values.email)) problems.push('a valid email address');
      if (!values.town) problems.push('a town');
      if (!findService(values.service)) problems.push(`a service from: ${SERVICE_LIST}`);
      for (const [field, limit] of Object.entries(limits)) {
        if (values[field as keyof typeof limits].length > limit) {
          problems.push(`${field} under ${limit} characters`);
        }
      }

      if (problems.length > 0) {
        return reply(
          `Nothing was filled in. The form needs ${problems.join('; ')}. Ask the person for what is missing rather than supplying it yourself, then call this again.`,
        );
      }

      values.notes = (townPrefix + values.notes).trim();
      values.town = listedTown ?? DROP_OFF.value;
      const townNote =
        !listedTown &&
        `Their town is outside the collection area, so the form is set to "${DROP_OFF.label}".`;

      /* No form listening. The values stay queued and fill the form if it
         opens later in this visit, so say that rather than "nothing was
         filled". */
      if (!requestPrefill(values)) {
        return reply(
          'The booking form is not on screen, so nothing is filled in yet. If it opens during this visit, these details will appear in it. Nothing has been sent.',
          townNote && '',
          townNote,
        );
      }

      return reply(
        'Done. The form on the page now has those details in it.',
        townNote && '',
        townNote,
        '',
        'Nothing has been sent. Tell the person to read it over, correct anything that came out wrong, and press Send themselves. This tool cannot press it.',
      );
    },
  },
];
