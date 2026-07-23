// Shared helpers used across all ported pages.

// Emits a <i data-lucide="..."> placeholder; call hydrateIcons() after inserting
// the markup into the DOM to turn these into inline SVGs (mirrors lucide-react).
export function icon(name, opts = {}) {
  const { size = 20, className = "", strokeWidth = 2, style = "", color = "" } = opts;
  const colorStyle = color ? `color:${color};` : "";
  return `<i data-lucide="${name}" class="${className}" style="width:${size}px;height:${size}px;flex-shrink:0;${colorStyle}${style}" stroke-width="${strokeWidth}"></i>`;
}

export function hydrateIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// Port of src/app/components/figma/ImageWithFallback.tsx: swap to an inline
// "broken image" placeholder if the real asset fails to load.
const FALLBACK_SVG_DATA_URL =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='88'%20height='88'%20viewBox='0%200%2088%2088'%20fill='none'%3E%3Crect%20width='88'%20height='88'%20rx='6'%20fill='%23EEEEEE'/%3E%3Cg%20clip-path='url(%23a)'%3E%3Cpath%20d='M11%2016c0-2.21%201.79-4%204-4h58c2.21%200%204%201.79%204%204v56c0%202.21-1.79%204-4%204H15c-2.21%200-4-1.79-4-4V16Z'%20stroke='%23999'%20stroke-width='2'/%3E%3Cpath%20d='m11%2059%2016.5-16.5%2011%2011L57%2035l20%2020'%20stroke='%23999'%20stroke-width='2'/%3E%3Ccircle%20cx='28'%20cy='28'%20r='5'%20stroke='%23999'%20stroke-width='2'/%3E%3C/g%3E%3C/svg%3E";

// Port of Intro.tsx's <Reveal>: fade/translate-up on scroll into view.
// Usage: wrap markup in `<div class="reveal" style="--reveal-delay:${delay}ms">...</div>`
// then call wireReveals() after the markup is in the DOM.
export function wireReveals(root = document) {
  const els = qsa(".reveal:not([data-reveal-wired])", root);
  els.forEach((el) => {
    el.setAttribute("data-reveal-wired", "1");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
  });
}

// Modal helper: mounts into a dedicated #modal-root (sibling of #app) so that
// unrelated re-renders of the current page/layout never wipe an open modal.
// `mountFn(overlay, close)` owns the modal's markup + its own internal re-render
// logic (mirrors each React modal component owning its local useState).
export function openModal(mountFn) {
  const root = document.getElementById("modal-root");
  root.innerHTML = '<div class="modal-overlay"></div>';
  const overlay = root.firstElementChild;
  function close() {
    root.innerHTML = "";
  }
  mountFn(overlay, close);
  hydrateIcons();
  wireImageFallbacks(root);
  return { close, overlay };
}

export function wireImageFallbacks(root = document) {
  qsa("img[data-fallback]", root).forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const originalUrl = img.src;
        img.src = FALLBACK_SVG_DATA_URL;
        img.setAttribute("data-original-url", originalUrl);
        img.classList.add("img-fallback");
      },
      { once: true }
    );
  });
}
