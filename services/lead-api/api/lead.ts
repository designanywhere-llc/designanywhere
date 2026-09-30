import { handleLead } from "../src/lead";
import { createRuntimeDeps } from "../src/runtime";

function deps() {
  return createRuntimeDeps(process.env);
}

export function POST(request: Request): Promise<Response> {
  return handleLead(request, deps());
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleLead(request, deps());
}
