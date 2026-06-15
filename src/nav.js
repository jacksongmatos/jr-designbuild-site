// Shared client-side navigation (History API — BrowserRouter-style).
//
// The site uses a lightweight custom router instead of react-router. This
// module centralizes URL handling so every internal link produces a real,
// crawlable path (e.g. /services) instead of a hash fragment (#/services).
// SPA deep links are served by the index.html fallback in public/_redirects.

// Derive the current route id from the pathname.
//   "/"           -> "home"
//   "/services"   -> "services"
//   "/cities/..." -> "cities" (static pages are served before the SPA loads)
export function routeFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  return (path.split("/")[0] || "home").split("?")[0];
}

// Navigate to a route id without a full page reload. Pushes a real URL and
// notifies the router (which listens for popstate).
export function navigate(to) {
  const id = String(to || "home").replace(/^\/+/, "");
  const path = !id || id === "home" ? "/" : `/${id}`;
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
