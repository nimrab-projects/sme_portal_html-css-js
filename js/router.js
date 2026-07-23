// Vanilla hash router replicating src/app/routes.tsx (createHashRouter).
//
// Route table shape (built in main.js):
//   standalone route: { path, render(container) }
//   layout route:      { path, layoutKey, layout: { mount(container) -> { renderOutlet(renderFn) } },
//                         children: [ { path: '' | 'businesses' | ..., index?: true, render(container) } ] }
//
// SME sub-routes are real hash paths (/sme, /sme/businesses, ...). Bank/SBP layouts
// only ever have a single index child — all their internal view-switching happens
// inside the layout module itself via local state, never touching the URL. That
// quirk lives entirely in bankLayout.js / sbpLayout.js, not here.

let routeTable = [];
let currentLayoutKey = null;
let currentLayoutInstance = null;

function parseHash() {
  let h = window.location.hash.slice(1) || "/";
  if (!h.startsWith("/")) h = "/" + h;
  if (h.length > 1 && h.endsWith("/")) h = h.slice(0, -1);
  return h;
}

export function getCurrentPath() {
  return parseHash();
}

export function navigate(path) {
  const target = "#" + path;
  if (window.location.hash === target) {
    // Same hash won't fire hashchange — force a re-render (mirrors navigating to the same route again).
    handleRouteChange();
  } else {
    window.location.hash = target;
  }
}

function matchLayoutChild(layoutRoute, path) {
  const base = layoutRoute.path; // e.g. "/sme"
  let rest = path.slice(base.length);
  if (rest.startsWith("/")) rest = rest.slice(1);
  const child = layoutRoute.children.find((c) => (c.index ? rest === "" : rest === c.path));
  return child || layoutRoute.children.find((c) => c.index);
}

function matchRoute(path) {
  for (const route of routeTable) {
    if (!route.children) {
      if (route.path === path) return { type: "standalone", render: route.render };
      continue;
    }
    if (path === route.path || path.startsWith(route.path + "/")) {
      const child = matchLayoutChild(route, path);
      if (child) return { type: "layout", layoutKey: route.layoutKey, layout: route.layout, child };
    }
  }
  return null;
}

function teardownLayout() {
  if (currentLayoutInstance && typeof currentLayoutInstance.destroy === "function") {
    currentLayoutInstance.destroy();
  }
  currentLayoutInstance = null;
  currentLayoutKey = null;
}

function handleRouteChange() {
  const path = parseHash();
  const match = matchRoute(path);
  const app = document.getElementById("app");

  if (!match) {
    // Unknown route: fall back to Intro, matching a hash router's implicit "no match" behavior gracefully.
    navigate("/");
    return;
  }

  if (match.type === "standalone") {
    teardownLayout();
    app.innerHTML = "";
    match.render(app);
    window.scrollTo(0, 0);
    return;
  }

  if (currentLayoutKey !== match.layoutKey) {
    teardownLayout();
    app.innerHTML = "";
    currentLayoutInstance = match.layout.mount(app);
    currentLayoutKey = match.layoutKey;
  }
  currentLayoutInstance.renderOutlet(match.child.render);
  window.scrollTo(0, 0);
}

export function start(routes) {
  routeTable = routes;
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}
