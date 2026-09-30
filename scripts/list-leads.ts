/**
 * List recent lead blobs for the owner's assistant.
 *
 *   BLOB_READ_WRITE_TOKEN=... npx tsx scripts/list-leads.ts
 *   npm run leads:list -- --limit 20
 *
 * Prints one JSON object per lead on stdout, newest first.
 * Email-failure sidecars (`*.email-error.json`) are omitted.
 */
import { list, type ListBlobResult } from "@vercel/blob";

type ListedBlob = ListBlobResult["blobs"][number];

function readLimit(argv: string[]): number {
  const index = argv.indexOf("--limit");
  if (index === -1) return 50;
  const value = Number(argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    console.error("--limit must be an integer from 1 to 1000.");
    process.exit(1);
  }
  return value;
}

function uploadedAtMs(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function isLeadBlob(pathname: string): boolean {
  return pathname.endsWith(".json") && !pathname.endsWith(".email-error.json");
}

async function listAllLeads(token: string): Promise<ListedBlob[]> {
  const blobs: ListedBlob[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await list({ prefix: "leads/", token, cursor, limit: 1000 });
    blobs.push(...result.blobs);
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return blobs;
}

async function main(): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is required.");
    process.exit(1);
  }

  const limit = readLimit(process.argv.slice(2));
  const leads = (await listAllLeads(token))
    .filter((blob) => isLeadBlob(blob.pathname))
    .sort((a, b) => uploadedAtMs(b.uploadedAt) - uploadedAtMs(a.uploadedAt))
    .slice(0, limit);

  for (const blob of leads) {
    const uploadedAt = blob.uploadedAt instanceof Date ? blob.uploadedAt : new Date(blob.uploadedAt);
    console.log(
      JSON.stringify({
        pathname: blob.pathname,
        uploadedAt: uploadedAt.toISOString(),
        size: blob.size,
        url: blob.url,
      }),
    );
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "Could not list leads.";
  console.error(message);
  process.exit(1);
});
