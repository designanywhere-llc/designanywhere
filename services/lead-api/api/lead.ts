import { handleLead } from "../src/lead.js";
import { createRuntimeDeps } from "../src/runtime.js";

function deps() {
  return createRuntimeDeps(process.env);
}

/** Web Request handler. Vercel calls POST/OPTIONS; the Node ESM smoke test calls this default. */
export default function leadHandler(request: Request): Promise<Response> {
  return handleLead(request, deps());
}

export function POST(request: Request): Promise<Response> {
  return leadHandler(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return leadHandler(request);
}
