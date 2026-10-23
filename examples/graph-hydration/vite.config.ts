import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

// WIDGETS sets the size of the dashboard, and WORK the iterations of busy work in each
// memo, so a build can model cheap computes or expensive ones.
export default defineConfig({
  define: {
    __WIDGETS__: JSON.stringify(Number(process.env.WIDGETS ?? 50)),
    __WORK__: JSON.stringify(Number(process.env.WORK ?? 0))
  },
  plugins: [solid({ start: {}, ssr: true })]
});
