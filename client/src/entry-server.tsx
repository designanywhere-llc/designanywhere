import { renderToString } from "react-dom/server";
import App from "./App";

/** Static HTML for one route. The client hydrates this markup. */
export function render(url: string): string {
  return renderToString(<App ssrPath={url} />);
}
