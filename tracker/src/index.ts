/**
 * WebStat tracking script. Embed as:
 *   <script defer src="https://your-webstat-deployment.vercel.app/script.js" data-site="example.com"></script>
 *
 * No cookies, no localStorage (aside from a tab-scoped visitor id used only for Stripe
 * revenue linkage), no PII. Sends one beacon per pageview/SPA route change, and exposes
 * window.webstat('track', name, props) for custom events.
 */

type WebstatFn = ((command: "track", name: string, props?: Record<string, unknown>) => void) & {
  visitorId?: string;
};

declare global {
  interface Window {
    webstat: WebstatFn;
    webstatq?: [string, string, Record<string, unknown>?][];
  }
}

export {};

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  const site = script?.getAttribute("data-site");
  if (!site) return;

  const endpoint = new URL("/api/track", script!.src).toString();
  let lastUrl = "";

  const webstat = ((command, name, props) => {
    if (command !== "track") return;
    send({ type: "custom", url: location.pathname + location.search, name, props }, false);
  }) as WebstatFn;

  function send(payload: Record<string, unknown>, captureVisitorId: boolean) {
    const body = JSON.stringify({ site, ...payload });

    if (captureVisitorId) {
      // Use fetch (not sendBeacon) once, so we can read the visitorId back for Stripe linkage.
      fetch(endpoint, {
        method: "POST",
        body,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
      })
        .then((res) => res.json())
        .then((data: { visitorId?: string }) => {
          if (data.visitorId) {
            webstat.visitorId = data.visitorId;
            try {
              sessionStorage.setItem("webstat_visitor_id", data.visitorId);
            } catch {
              // Storage may be unavailable (private mode) — non-fatal, linkage just won't persist.
            }
          }
        })
        .catch(() => {});
      return;
    }

    const sent =
      "sendBeacon" in navigator &&
      navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }));

    if (!sent) {
      fetch(endpoint, {
        method: "POST",
        body,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
      }).catch(() => {});
    }
  }

  function pageview() {
    const url = location.pathname + location.search;
    if (url === lastUrl) return;
    const isFirst = lastUrl === "";
    lastUrl = url;
    send(
      { type: "pageview", url, referrer: document.referrer || null, w: window.innerWidth },
      isFirst,
    );
  }

  // Track SPA route changes (pushState-based routers) in addition to full page loads.
  const originalPushState = history.pushState;
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState.apply(this, args);
    pageview();
  };
  window.addEventListener("popstate", pageview);

  try {
    webstat.visitorId = sessionStorage.getItem("webstat_visitor_id") || undefined;
  } catch {
    // ignore
  }

  window.webstat = webstat;

  // Flush anything queued before the script loaded, e.g. window.webstatq = [['track', 'signup']]
  for (const [command, name, props] of window.webstatq || []) {
    if (command === "track") webstat("track", name, props);
  }

  pageview();
})();
