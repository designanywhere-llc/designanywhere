/**
 * Compile the lead API and import it with plain Node ESM.
 * tsx accepts extensionless imports, which is what hid ERR_MODULE_NOT_FOUND on Vercel.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "services/lead-api/dist");

delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.RESEND_API_KEY;
process.env.NODE_ENV = "production";

await execFileAsync(
  process.execPath,
  [
    path.join(repoRoot, "node_modules/typescript/lib/tsc.js"),
    "-p",
    path.join(repoRoot, "services/lead-api/tsconfig.json"),
    "--outDir",
    outDir,
  ],
  { cwd: repoRoot },
);

try {
  const entryPath = path.join(outDir, "api/lead.js");
  const entrySource = await readFile(entryPath, "utf8");
  assert.match(entrySource, /from\s+["']\.\.\/src\/lead\.js["']/);
  assert.equal(entrySource.includes('from "../src/lead"'), false);
  assert.equal(entrySource.includes("from '../src/lead'"), false);

  const mod = await import(pathToFileURL(entryPath).href);
  assert.equal(typeof mod.default, "function");
  assert.equal(typeof mod.POST, "function");
  assert.equal(typeof mod.OPTIONS, "function");

  const honeypot = await mod.default(
    new Request("https://api.designanywhere.org/api/lead", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://designanywhere.org",
      },
      body: JSON.stringify({
        _honey: "bot",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        message: "This must not be stored.",
      }),
    }),
  );
  const honeypotBody = await honeypot.json();
  assert.equal(honeypot.status, 200);
  assert.equal(honeypotBody.success, true);
  assert.equal(typeof honeypotBody.id, "string");
  assert.equal(honeypotBody.emailed, undefined);
  assert.equal(honeypotBody.emailId, undefined);

  const preflight = await mod.OPTIONS(
    new Request("https://api.designanywhere.org/api/lead", {
      method: "OPTIONS",
      headers: { origin: "https://designanywhere.org" },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://designanywhere.org");

  const missingToken = await mod.POST(
    new Request("https://api.designanywhere.org/api/lead", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://designanywhere.org",
        "x-forwarded-for": "203.0.113.44",
      },
      body: JSON.stringify({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        service: "Product Design",
        subject: "Prototype quote",
        message: "Need a bracket redesigned for machining.",
        type: "contact",
        _honey: "",
      }),
    }),
  );
  const missingBody = await missingToken.json();
  assert.equal(missingToken.status, 503);
  assert.equal(missingBody.success, false);
  assert.equal(JSON.stringify(missingBody).includes("ERR_MODULE_NOT_FOUND"), false);
} finally {
  await rm(outDir, { recursive: true, force: true });
}

console.log("lead API Node ESM smoke test passed");
