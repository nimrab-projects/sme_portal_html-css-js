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

// Supports a ":id"-style dynamic segment in a child's path (e.g. "tracking/:id"), needed once
// Application Tracking/Details had to carry a real per-record ID through internal hash
// navigation (Phase 8) - previously every child path was a fixed literal string. Matching is by
// segment count + per-segment comparison rather than the old strict `rest === c.path` string
// equality, but every existing (colon-free, single-segment) child path matches exactly the same
// way it always did, so this is backward compatible with every route registered before Phase 8.
function matchLayoutChild(layoutRoute, path) {
  const base = layoutRoute.path; // e.g. "/sme"
  let rest = path.slice(base.length);
  if (rest.startsWith("/")) rest = rest.slice(1);
  const restSegments = rest === "" ? [] : rest.split("/");

  for (const c of layoutRoute.children) {
    if (c.index) {
      if (restSegments.length === 0) return { child: c, params: {} };
      continue;
    }
    const childSegments = c.path.split("/");
    if (childSegments.length !== restSegments.length) continue;

    const params = {};
    let matched = true;
    for (let i = 0; i < childSegments.length; i++) {
      if (childSegments[i].startsWith(":")) {
        params[childSegments[i].slice(1)] = restSegments[i];
      } else if (childSegments[i] !== restSegments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { child: c, params };
  }

  const indexChild = layoutRoute.children.find((c) => c.index);
  return indexChild ? { child: indexChild, params: {} } : null;
}

function matchRoute(path) {
  for (const route of routeTable) {
    if (!route.children) {
      if (route.path === path) return { type: "standalone", render: route.render };
      continue;
    }
    if (path === route.path || path.startsWith(route.path + "/")) {
      const matched = matchLayoutChild(route, path);
      if (matched) return { type: "layout", layoutKey: route.layoutKey, layout: route.layout, child: matched.child, params: matched.params };
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
  currentLayoutInstance.renderOutlet(match.child.render, match.params);
  window.scrollTo(0, 0);
}

export function start(routes) {
  routeTable = routes;
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}
