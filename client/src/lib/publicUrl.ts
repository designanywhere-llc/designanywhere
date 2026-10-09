/** Prefix a site-root path with Vite's base (required on GitHub project Pages). */
export function publicUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath.replace(/^\//, "")}`;
}

/**
 * Real-work photos under `client/public/images/services/<serviceId>/`.
 * Pass the filenames to serve (the homepage uses `02.jpg`–`04.jpg`).
 * Stock `01.jpg` leads are not part of the rotation. See that folder's README.
 */
export function serviceImageUrls(serviceId: string, files: readonly string[]): string[] {
  return files.map((file) => publicUrl(`images/services/${serviceId}/${file}`));
}
