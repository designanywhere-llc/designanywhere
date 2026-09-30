import { handleLead } from "../src/lead.js";
import { createRuntimeDeps } from "../src/runtime.js";

function deps() {
  return createRuntimeDeps(process.env);
}

// Named web-handler exports only. A default-exported function is a legacy
// (req, res) handler on Vercel and hangs until the invocation times out.
export function POST(request: Request): Promise<Response> {
  return handleLead(request, deps());
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleLead(request, deps());
}
