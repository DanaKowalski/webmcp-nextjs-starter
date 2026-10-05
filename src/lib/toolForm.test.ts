import { describe, expect, it } from 'vitest';
import { fieldsOf, inputFromForm, type ControlValue } from '@/lib/toolForm';

const tool: WebMCP.Tool = {
  name: 'demo',
  description: 'A demo tool.',
  inputSchema: {
    type: 'object',
    properties: {
      service: { type: 'string', enum: ['a', 'b'] },
      count: { type: 'integer' },
      collection: { type: 'boolean' },
      notes: { type: 'string' },
    },
    required: ['service'],
  },
  execute: () => ({ content: [] }),
};

const controls =
  (values: Record<string, Partial<ControlValue>>) =>
  (name: string): ControlValue | null =>
    name in values ? { value: '', checked: false, ...values[name] } : null;

describe('fieldsOf', () => {
  it('lists fields in schema order and marks the required ones', () => {
    expect(fieldsOf(tool).map((f) => [f.name, f.required])).toEqual([
      ['service', true],
      ['count', false],
      ['collection', false],
      ['notes', false],
    ]);
  });

  it('returns no fields for a tool without a schema', () => {
    expect(fieldsOf({ ...tool, inputSchema: undefined })).toEqual([]);
  });
});

describe('inputFromForm', () => {
  const fields = fieldsOf(tool);

  it('converts each field to its schema type', () => {
    expect(
      inputFromForm(
        fields,
        controls({
          service: { value: 'a' },
          count: { value: ' 3 ' },
          collection: { checked: true },
          notes: { value: ' slips ' },
        }),
      ),
    ).toEqual({ service: 'a', count: 3, collection: true, notes: 'slips' });
  });

  it('leaves blank fields out but always sends booleans', () => {
    expect(
      inputFromForm(fields, controls({ service: { value: '' }, notes: { value: '  ' }, collection: {} })),
    ).toEqual({ collection: false });
  });

  it('skips fields with no control on the form', () => {
    expect(inputFromForm(fields, controls({}))).toEqual({});
  });
});
