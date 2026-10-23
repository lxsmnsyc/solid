// A dashboard of widgets, each with signals, memos and bindings, rendered on the server and
// hydrated. The memos are deterministic, so the server and the client agree on their values.
import { createMemo, createSignal } from "solid-js";

declare const __WIDGETS__: number;
declare const __WORK__: number;

/** Busy work that stands for an expensive compute, such as sorting or formatting a big list. */
function work(seed: number): number {
  let x = seed;
  for (let i = 0; i < __WORK__; i++) x = (x * 1103515245 + 12345) % 2147483648;
  return x % 7;
}

const NAMES = ["Total", "Average", "Range"];

function Widget(props: { index: number }) {
  const seed = props.index;
  const [items, setItems] = createSignal(
    Array.from({ length: 6 }, (_, i) => ((seed * 7 + i * 13) % 50) + 1)
  );
  const [mode, setMode] = createSignal(seed % 3);
  const sorted = createMemo(() => [...items()].sort((a, b) => a - b));
  const summary = createMemo(() => {
    const values = sorted();
    const sum = values.reduce((a, b) => a + b, 0) + work(seed);
    return mode() === 0 ? sum : mode() === 1 ? sum / values.length : values[5] - values[0];
  });
  const label = createMemo(() => `${NAMES[mode()]}: ${summary().toFixed(2)}`);
  const bars = createMemo(() =>
    sorted()
      .map(n => "#".repeat(Math.round(n / 10) + work(n)))
      .join(" ")
  );
  return (
    <section class="widget">
      <h2>Widget {seed}</h2>
      <p class="label">{label()}</p>
      <pre>{bars()}</pre>
      <button onClick={() => setItems(values => values.map(n => ((n * 3 + 1) % 50) + 1))}>
        Run
      </button>
      <button onClick={() => setMode(m => (m + 1) % 3)}>Mode {mode()}</button>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <h1>Dashboard</h1>
      {Array.from({ length: __WIDGETS__ }, (_, index) => (
        <Widget index={index} />
      ))}
    </main>
  );
}
