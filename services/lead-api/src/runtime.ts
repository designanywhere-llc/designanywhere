import { put } from "@vercel/blob";
import { Resend } from "resend";
import { toResendPayload } from "./email";
import type { BlobPutOptions, BlobPutResult, LeadDeps } from "./lead";
import type { LeadEnv } from "./cors";

/**
 * Blob first, then Resend. `BLOB_READ_WRITE_TOKEN` is read by `@vercel/blob`
 * from the environment Vercel injects when a Blob store is connected.
 */
export function createRuntimeDeps(env: LeadEnv): LeadDeps {
  return {
    env,
    async putBlob(pathname: string, body: string, options: BlobPutOptions): Promise<BlobPutResult> {
      const result = await put(pathname, body, {
        access: options.access,
        addRandomSuffix: options.addRandomSuffix,
        allowOverwrite: options.allowOverwrite,
        contentType: options.contentType,
        cacheControlMaxAge: options.cacheControlMaxAge,
        token: env.BLOB_READ_WRITE_TOKEN,
      });
      return { pathname: result.pathname, url: result.url };
    },
    async sendEmail(message) {
      const apiKey = env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error("RESEND_API_KEY is not set");
      }
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send(toResendPayload(message));
      if (error) {
        throw new Error(error.message || "Resend rejected the email");
      }
    },
  };
}
