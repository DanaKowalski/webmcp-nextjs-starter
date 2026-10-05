'use client';

import { useRef, useSyncExternalStore, type FormEvent, type KeyboardEvent } from 'react';
import type { CallLog, CallLogState, CallStatus } from '@/lib/callLog';
import { getModelContext } from '@/lib/modelContext';
import { fieldsOf, inputFromForm, isNumeric, type FormField } from '@/lib/toolForm';
import styles from './WebMcpPanel.module.css';

const RESULT_LABEL: Record<CallStatus, string> = { running: 'Running…', done: 'Sent back', error: 'Failed' };

const NOTHING: CallLogState = { entries: [], open: false, seen: false };
const noSubscribe = () => () => {};

/* Floating "WebMCP Tools" pill (demo only). Lists the page's tools, lets you
   try each one by hand, and logs every call as it happens. The log and the
   open state come back after a reload.

   Rendered only in the browser: whether WebMCP is on cannot be known on the
   server, so the server snapshot is null and nothing renders until the
   client takes over. */
export default function WebMcpPanel({
  tools,
  log,
  onTry,
}: {
  tools: WebMCP.Tool[];
  log: CallLog;
  onTry: (name: string, input: WebMCP.ToolInput) => void;
}) {
  const supported = useSyncExternalStore(
    noSubscribe,
    () => Boolean(getModelContext()),
    () => null,
  );
  const { entries, open, seen } = useSyncExternalStore(
    log.subscribe,
    log.getSnapshot,
    () => NOTHING,
  );
  const pill = useRef<HTMLButtonElement>(null);

  if (supported === null) return null;

  /* On the panel, not the document, so Escape only closes it when focus is
     inside it. Escape in the page's own form belongs to the page. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !open) return;
    log.setOpen(false);
    pill.current?.focus();
  };

  const running = new Set(
    entries.filter((e) => e.status === 'running').map((e) => e.tool),
  );

  const submit =
    (name: string, fields: FormField[]) => (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { elements } = e.currentTarget;
      onTry(
        name,
        inputFromForm(fields, (key) => {
          const el = elements.namedItem(key);
          if (el instanceof HTMLInputElement) return { value: el.value, checked: el.checked };
          if (el instanceof HTMLSelectElement) return { value: el.value, checked: false };
          return null;
        }),
      );
    };

  return (
    <div className={styles.panel} onKeyDown={onKeyDown}>
      <button
        ref={pill}
        type="button"
        className={`${styles.pill} ${running.size ? styles.running : seen ? '' : styles.beckon}`}
        aria-expanded={open}
        aria-controls="webmcp-body"
        onClick={() => log.setOpen(!open)}
      >
        <span
          className={`${styles.dot} ${supported ? styles.on : styles.off}`}
          aria-hidden="true"
        />
        <span>WebMCP Tools</span>
        <span className={styles.count}>{tools.length}</span>
      </button>

      <div className={styles.body} id="webmcp-body" hidden={!open}>
        <p className={styles.status}>
          {supported
            ? 'WebMCP is on in this browser. Agents can see these tools.'
            : 'WebMCP is not available in this browser. "Try it" still works.'}
        </p>

        <section className={styles.col}>
          <div className={styles.logHeader}>
            <h2 className={styles.heading}>Activity</h2>
            <button
              type="button"
              className={styles.link}
              onClick={() => log.clear()}
            >
              Clear
            </button>
          </div>
          <ol className={styles.list} aria-live="polite">
            {entries.length === 0 && (
              <li className={styles.empty}>No calls yet.</li>
            )}
            {/* One line per call; only the newest is expanded. */}
            {entries.map((entry, i) => (
              <li key={entry.id} className={`${styles.entry} ${styles[entry.status]}`}>
                <details open={i === 0}>
                  <summary className={styles.entryHead}>
                    <span className={styles.entryStatus} aria-hidden="true" />
                    <span className={styles.entryTool}>{entry.tool}</span>
                    <span className={styles.source}>{entry.source}</span>
                    <time>{entry.time}</time>
                  </summary>
                  <div className={styles.entryBody}>
                    <div className={styles.label}>Asked for</div>
                    <pre>{entry.input}</pre>
                    <div className={styles.label}>
                      {RESULT_LABEL[entry.status]}
                    </div>
                    <pre data-result hidden={!entry.output}>
                      {entry.output}
                    </pre>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.col}>
          <h2 className={styles.heading}>Tools</h2>
          <ul className={styles.list}>
            {tools.map((tool) => {
              const fields = fieldsOf(tool);

              /* One thin row per tool; expand it for the description and
                 the Run form. */
              return (
                <li
                  key={tool.name}
                  className={`${styles.tool} ${running.has(tool.name) ? styles.running : ''}`}
                >
                  <details>
                    <summary>
                      <span className={styles.toolName}>{tool.name}</span>
                      {tool.title && (
                        <span className={styles.toolTitle}>{tool.title}</span>
                      )}
                    </summary>
                    <p className={styles.toolDesc}>{tool.description}</p>
                    <form
                      className={styles.tryForm}
                      onSubmit={submit(tool.name, fields)}
                    >
                      {fields.map((field) => (
                        <Field
                          key={field.name}
                          id={`webmcp-${tool.name}-${field.name}`}
                          field={field}
                        />
                      ))}
                      <button type="submit" className={styles.run}>
                        Run
                      </button>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* One control per schema property. The parameter description is shown as
   visible hint text tied to the control, because it is the same text an
   agent reads to decide what to send. */
function Field({ id, field }: { id: string; field: FormField }) {
  const { name, property, required } = field;
  const label = `${name}${required ? ' *' : ''}`;
  const hintId = property.description ? `${id}-hint` : undefined;
  const shared = { id, name, required, 'aria-describedby': hintId };

  const isCheck = property.type === 'boolean';
  const control = isCheck ? (
    <input {...shared} type="checkbox" required={false} />
  ) : Array.isArray(property.enum) ? (
    <select {...shared}>
      <option value="">{required ? 'Pick one' : '(none)'}</option>
      {property.enum.map((value) => (
        <option key={String(value)} value={String(value)}>
          {String(value)}
        </option>
      ))}
    </select>
  ) : (
    <input
      {...shared}
      type={isNumeric(property) ? 'number' : 'text'}
      maxLength={property.maxLength}
    />
  );

  return (
    <div className={styles.field}>
      <label className={isCheck ? styles.fieldCheck : styles.fieldLabel} htmlFor={id}>
        {isCheck && control}
        <span>{label}</span>
      </label>
      {!isCheck && control}
      {hintId && (
        <span id={hintId} className={styles.hint}>
          {property.description}
        </span>
      )}
    </div>
  );
}
