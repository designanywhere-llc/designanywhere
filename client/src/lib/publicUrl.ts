/** Prefix a site-root path with Vite's base (required on GitHub project Pages). */
export function publicUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath.replace(/^\//, "")}`;
}

/**
 * Numbered photos under `client/public/images/services/<serviceId>/`.
 * Drop-in replacements: `01.jpg` … `0N.jpg` (JPEG). See that folder's README.
 */
export function serviceImageUrls(serviceId: string, count = 4): string[] {
  return Array.from({ length: count }, (_, i) =>
    publicUrl(
      `images/services/${serviceId}/${String(i + 1).padStart(2, "0")}.jpg`,
    ),
  );
}
