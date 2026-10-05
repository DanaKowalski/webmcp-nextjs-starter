import BookingForm from '@/components/BookingForm';
import CodeBlock from '@/components/CodeBlock';
import { HELPER, LIST_TOOLS } from '@/lib/consoleSnippets';
import { COLLECTION_FEE, SERVICES, SHOP, TOWNS, listInWords } from '@/lib/shop';

const CALLS: { code: string; note: string }[] = [
  {
    code: `call('get_services')`,
    note: 'No arguments. Reads straight from the same file this page renders from.',
  },
  {
    code: `call('get_quote', { service: 'wheel-build', collection: true })`,
    note: 'Should come back $195. Change the service, or drop collection, and run it again.',
  },
  {
    code: `call('get_quote', { service: 'moon-landing' })`,
    note: 'A deliberately wrong value. The tool answers with the list of valid ones instead of just failing.',
  },
  {
    code: `call('check_service_area', { town: 'Bramley' })`,
    note: 'Try a town that is not on the list too. Both answers are useful.',
  },
  {
    code: `call('start_booking', {
  name: 'Sam Ellis',
  email: 'sam@example.com',
  town: 'Bramley',
  service: 'tune-up',
  notes: 'Gears slip under load going uphill.',
})`,
    note: 'Watch the form below fill itself in. Nothing is sent: the Send button is still yours to press.',
  },
];

export default function Home() {
  return (
    <main>
      <section className="outline">
        <h2>What this page is</h2>
        <p>
          A working <strong>WebMCP</strong> demo. This page hands an AI agent
          four tools it can call directly, instead of making it read the screen
          and guess where to click. Below, you call them yourself from the
          browser console and watch the page answer.
        </p>
        <nav className="jump" aria-label="On this page">
          <a href="#pricing">Sample business data</a>
          <a href="#tools">Try the tools</a>
          <a href="#booking">The booking form</a>
        </nav>
      </section>

      <h1>{SHOP.name}</h1>
      <p className="lede">{SHOP.tagline}</p>

      <div className="card" id="pricing">
        <h2>What it costs</h2>
        <p className="small muted">
          The data the tools answer from. It lives in one file,{' '}
          <code>src/lib/shop.ts</code>, which this page and every tool read,
          so a price cannot say one thing here and another to an agent.
        </p>
        <div className="grid">
          {SERVICES.map((service) => (
            <div className="row" key={service.id}>
              <div>
                <h3>{service.name}</h3>
                <p className="muted small">
                  {service.summary}
                </p>
              </div>
              <div className="price">${service.price}</div>
            </div>
          ))}
        </div>
        <p className="muted small footnote">
          Collection is ${COLLECTION_FEE} from {listInWords(TOWNS)}. Drop-off is
          welcome from anywhere.
          {' '}
          {/* Kept on the page rather than only in the tools. `get_services`
              and `get_quote` both answer with this line, and a tool saying
              something the page never does is exactly the drift this file
              structure exists to prevent. */}
          {SHOP.turnaround}
        </p>
      </div>

      <div className="card" id="tools">
        <h2>Try the tools</h2>
        <p className="small">
          You are going to act as the agent. Open DevTools with{' '}
          <kbd>F12</kbd>, go to the Console tab, and work down this list. Copy
          each block, paste it at the <code>&gt;</code> prompt, press Enter.
        </p>

        <ol className="steps">
          <li>
            <h3>See what this page offers</h3>
            <p className="small muted">
              Four names come back. If you get an error instead, the API is not
              available: enable{' '}
              <code>chrome://flags/#enable-webmcp-testing</code> and restart
              Chrome. It also only works over https or on localhost, so an
              address like <code>http://192.168.1.5:3000</code> gets nothing.
            </p>
            <CodeBlock code={LIST_TOOLS} />
          </li>

          <li>
            <h3>Set up a shortcut</h3>
            <p className="small muted">
              A shortcut, so you are not retyping the same lines for every
              call. It also handles the argument format, which changed during
              the trial: a plain object on current Chrome, a JSON string on
              older builds.
            </p>
            <CodeBlock code={HELPER} />
          </li>

          <li>
            <h3>Call them</h3>
            <p className="small muted">
              One at a time, in any order. Edit the values and run them again:
              that is the whole point of it being on your machine.
            </p>
            {CALLS.map((call) => (
              <div className="call" key={call.code}>
                <CodeBlock code={call.code} />
                <p className="small muted">{call.note}</p>
              </div>
            ))}
          </li>
        </ol>

        <p className="small muted">
          Everything you just did by hand is what a browser-based agent will do
          on its own once one ships that speaks WebMCP. The page does not know
          or care whether a person or an agent is calling.
        </p>
      </div>

      <BookingForm />
    </main>
  );
}
