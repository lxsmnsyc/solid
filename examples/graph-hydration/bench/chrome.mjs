// The Chrome to measure with: CHROME_PATH, or the usual install of Chrome on macOS, Linux or
// Windows. Playwright's own Chromium works too, through CHROME_PATH.
import { existsSync } from "node:fs";

const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
];

export function findChrome() {
  const path = process.env.CHROME_PATH || CANDIDATES.find(candidate => existsSync(candidate));
  if (!path) throw new Error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.");
  return { executablePath: path };
}
