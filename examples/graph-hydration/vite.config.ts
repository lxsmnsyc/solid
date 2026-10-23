import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

// WIDGETS sets the size of the dashboard, WORK the iterations of busy work in each memo, so a
// build can model cheap computes or expensive ones, and ASYNC=1 adds an async memo to each
// widget, which hydration traces instead of computing. The page renders whole (`async`), so
// its hydration is one synchronous pass.
export default defineConfig({
  define: {
    __WIDGETS__: JSON.stringify(Number(process.env.WIDGETS ?? 50)),
    __WORK__: JSON.stringify(Number(process.env.WORK ?? 0)),
    __ASYNC__: JSON.stringify(process.env.ASYNC === "1")
  },
  plugins: [solid({ start: { renderMode: "async" }, ssr: true })]
});
