# Serializing the reactive graph for hydration: findings

Can the server send each memo's value with the signals it read, so that hydration skips the compute and links the edges from the data instead? This branch measures the cost the idea removes, prototypes it, and measures it on the example apps.

## How hydration works today

- A memo with a serialized value is an async one: the server serializes only those. Hydration takes the value, and runs the compute once under mocks (`subFetch`) to find its dependencies. Its result is thrown away.
- A synchronous memo has no serialized value, so hydration runs its compute.
- Effects run their computes. The compute of an `insert()` renders the components inside it and claims their DOM.

## The prototype

- With `GRAPH=1`, every render turns on the dependency-edge hooks of server components (`server/edges.ts`). A memo with a plain value sends `[value, signal names]` under `<memo id>#g`, if its compute took at least `GRAPH_MIN_MS` on the server. An edge through another memo lands on that memo's signals.
- The client names its plain signals as the server does (`core/identities.ts`, plus a lookup by name). A memo with an entry takes the value and reads the named signals, which links its edges, without running its compute. It computes if a signal is missing, and on every later run.
- About 100 lines, in `solid/src/server/signals.ts`, `server/edges.ts`, `client/hydration.ts`, `web/src/client.ts`, `web/src/server.ts` and `signals/src/core/identities.ts`. Every change is marked `EXPERIMENT(graph-hydration)`.

## Results

Chrome with the CPU slowed 4 times, the median of 9 loads, on an Apple M2. Each page is checked: a click after hydration updates it.

The dashboard of this example, 200 widgets of 4 memos each. "Busy" memos run a loop of 2000 steps.

| Memos | Graph                  | HTML, brotli | Client, until hydrated |
| ----- | ---------------------- | -----------: | ---------------------: |
| cheap | off                    |       4.0 kB |                 108 ms |
| cheap | every memo             |      15.5 kB |                 116 ms |
| cheap | memos of 0.02 ms or more |    4.05 kB |                 110 ms |
| busy  | off                    |       4.0 kB |                 209 ms |
| busy  | every memo             |      15.4 kB |                 109 ms |
| busy  | memos of 0.02 ms or more |     8.4 kB |                 112 ms |

The example apps of the repository, with the graph off. "Memos with data" is the most that a serialized graph could skip.

| App          | Hydration | Memos with data | Memos with nodes | Effects        | Traces |
| ------------ | --------: | --------------: | ---------------: | -------------: | -----: |
| board        |   46.8 ms |   1.6 ms (3%)   |           0.0 ms | 18.1 ms (39%)  | 0.5 ms |
| chat         |   33.3 ms |   3.0 ms (9%)   |           4.1 ms | 14.1 ms (42%)  | 0.1 ms |
| hackernews   |   24.3 ms |   4.0 ms (16%)  |           5.8 ms |  9.7 ms (40%)  | 0.1 ms |
| notes        |   33.5 ms |   9.3 ms (28%)  |           4.5 ms | 15.2 ms (45%)  | 0.1 ms |
| todos-server |   21.9 ms |   3.3 ms (15%)  |           0.0 ms | 11.8 ms (54%)  |      0 |
| server-dbmon |   33.0 ms |   3.9 ms (12%)  |           6.0 ms | 10.4 ms (32%)  | 0.5 ms |

## Conclusions

- The graph works: adopted memos keep their values and update on the next change.
- It pays only for expensive synchronous memos. A cheap memo costs about as much to decode and link as to compute, and its entry triples the HTML. Sending only the memos that were slow on the server keeps the gain and drops most of the cost.
- Trace runs of async memos cost almost nothing (0 to 0.5 ms a page).
- In the example apps, the memos that the graph could skip take 1.6 to 9.3 ms, and are mostly the router's: path matching, `new URL`, `routerState.matches` and route `preload`, which loads data and cannot be skipped.
- Most of hydration is one `insert()` per page that renders and claims its components. A graph cannot skip that: only components that never run can, which is resumability.

So the idea is not worth adding to Solid 2.0 for apps built like these examples. It could be an opt-in for one memo with an expensive compute, such as `createMemo(fn, { ssrSource: "graph" })`. The router memos that run during hydration are a cheaper target.

## Running it

From the root of the repository, after `pnpm install` and a build of `@solidjs/web` and its dependencies, and of `packages/compiler` (`pnpm --filter @solidjs/compiler build`):

```sh
# The dashboard. Each variant: widgets, work, async (0/1), graph (0/1), min ms.
VARIANTS="200 0 0 0,200 0 0 1,200 2000 0 0,200 2000 0 1" bash examples/graph-hydration/bench/solid-variants.sh

# The example apps, after `vite build` in each. TOP=1 lists the costliest computes.
TOP=1 bash examples/graph-hydration/bench/solid-apps.sh
```

The scripts drive Chrome with `playwright-core` from the brumate repository's benchmark harness (`brumate/benchmarks/harness`), by absolute path. Point them at another copy to run them elsewhere.
