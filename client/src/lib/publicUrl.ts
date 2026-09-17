/** Prefix a site-root path with Vite's base (required on GitHub project Pages). */
export function publicUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath.replace(/^\//, "")}`;
}
