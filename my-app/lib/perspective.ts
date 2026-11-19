/**
 * Browser-only loader for FINOS Perspective (https://perspective.finos.org).
 *
 * Perspective ships as WebAssembly + Web Workers, which do not bundle cleanly
 * through Next.js. Instead we load its official CDN ES-module builds at runtime
 * from a module <script>, which keeps them out of the app bundle entirely and
 * only costs the download on the admin analytics page.
 */

export const PERSPECTIVE_VERSION = "3.8.0";
const CDN = "https://cdn.jsdelivr.net/npm/@finos";

export type PerspectiveSchema = Record<string, "string" | "integer" | "float" | "boolean" | "date" | "datetime">;

export interface PerspectiveTable {
  update(rows: Record<string, unknown>[]): Promise<unknown>;
  delete(): Promise<void>;
}

export interface PerspectiveClient {
  table(data: PerspectiveSchema | Record<string, unknown>[], options?: { name?: string }): Promise<PerspectiveTable>;
}

interface PerspectiveModule {
  worker(): Promise<PerspectiveClient>;
}

export interface PerspectiveViewerElement extends HTMLElement {
  load(table: PerspectiveTable | Promise<PerspectiveTable>): Promise<unknown>;
  restore(config: Record<string, unknown>): Promise<unknown>;
  toggleConfig(force?: boolean): Promise<unknown>;
  download(flat?: boolean): Promise<unknown>;
  delete(): Promise<unknown>;
}

declare global {
  interface Window {
    __imagesPerspective?: Promise<PerspectiveModule>;
    __imagesPerspectiveWorker?: Promise<PerspectiveClient>;
  }
}

function loadModule(): Promise<PerspectiveModule> {
  return new Promise((resolve, reject) => {
    const stylesheet = `${CDN}/perspective-viewer@${PERSPECTIVE_VERSION}/dist/css/themes.css`;
    if (!document.querySelector(`link[href="${stylesheet}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      // Perspective discovers themes by reading the sheet's rules, which the
      // browser only allows for a cross-origin sheet fetched with CORS.
      link.crossOrigin = "anonymous";
      link.href = stylesheet;
      document.head.appendChild(link);
    }

    const eventName = `perspective-loaded-${Date.now()}`;
    const timeout = window.setTimeout(() => reject(new Error("Timed out loading Perspective from the CDN.")), 45_000);
    window.addEventListener(
      eventName,
      (event) => {
        window.clearTimeout(timeout);
        const detail = (event as CustomEvent<{ perspective?: PerspectiveModule; error?: string }>).detail;
        if (detail.perspective) resolve(detail.perspective);
        else reject(new Error(detail.error || "Perspective failed to load."));
      },
      { once: true },
    );

    const script = document.createElement("script");
    script.type = "module";
    // Viewer must register before its plugins; plugins can load in parallel.
    script.textContent = `
      try {
        const { default: perspective } = await import("${CDN}/perspective@${PERSPECTIVE_VERSION}/dist/cdn/perspective.js");
        await import("${CDN}/perspective-viewer@${PERSPECTIVE_VERSION}/dist/cdn/perspective-viewer.js");
        await Promise.all([
          import("${CDN}/perspective-viewer-datagrid@${PERSPECTIVE_VERSION}/dist/cdn/perspective-viewer-datagrid.js"),
          import("${CDN}/perspective-viewer-d3fc@${PERSPECTIVE_VERSION}/dist/cdn/perspective-viewer-d3fc.js"),
        ]);
        await customElements.whenDefined("perspective-viewer");
        window.dispatchEvent(new CustomEvent("${eventName}", { detail: { perspective } }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent("${eventName}", { detail: { error: String(error) } }));
      }
    `;
    document.head.appendChild(script);
  });
}

/** Loads Perspective once per page and returns a shared Web Worker client. */
export function getPerspectiveWorker(): Promise<PerspectiveClient> {
  if (!window.__imagesPerspectiveWorker) {
    window.__imagesPerspective ??= loadModule();
    window.__imagesPerspectiveWorker = window.__imagesPerspective
      .then((perspective) => perspective.worker())
      .catch((error) => {
        // Allow a retry on the next call instead of caching the failure.
        window.__imagesPerspective = undefined;
        window.__imagesPerspectiveWorker = undefined;
        throw error;
      });
  }
  return window.__imagesPerspectiveWorker;
}
