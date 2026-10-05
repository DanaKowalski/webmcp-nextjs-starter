// src/lib/toolForm.ts

/* Turns a tool's inputSchema into the fields of the panel's Run form, and the
   filled-in form back into tool arguments. Only the flat shapes these tools
   use: string, number, integer, boolean and string enums. */

export interface SchemaProperty {
  type?: string;
  description?: string;
  enum?: readonly unknown[];
  maxLength?: number;
}

export interface FormField {
  name: string;
  property: SchemaProperty;
  required: boolean;
}

/** The form fields for a tool, in schema order. */
export function fieldsOf(tool: WebMCP.Tool): FormField[] {
  const schema = (tool.inputSchema ?? {}) as {
    properties?: Record<string, SchemaProperty>;
    required?: string[];
  };
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    name,
    property,
    required: required.has(name),
  }));
}

export const isNumeric = (property: SchemaProperty) =>
  property.type === 'number' || property.type === 'integer';

/** What one form control holds. `checked` is only read for booleans. */
export interface ControlValue {
  value: string;
  checked: boolean;
}

/**
 * Tool arguments from the form. A blank optional field is left out rather
 * than sent as an empty string, which is what an agent would do.
 */
export function inputFromForm(
  fields: FormField[],
  read: (name: string) => ControlValue | null,
): WebMCP.ToolInput {
  const input: WebMCP.ToolInput = {};
  for (const { name, property } of fields) {
    const control = read(name);
    if (!control) continue;
    if (property.type === 'boolean') {
      input[name] = control.checked;
      continue;
    }
    const raw = control.value.trim();
    if (raw === '') continue;
    input[name] = isNumeric(property) ? Number(raw) : raw;
  }
  return input;
}
