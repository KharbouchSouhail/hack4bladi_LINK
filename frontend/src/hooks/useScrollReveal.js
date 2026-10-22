import { useEffect } from "react";

// Children of `.stagger` and anything marked `data-reveal` ("up", "left", "right" or "scale").
const TARGETS = ".stagger > *, [data-reveal]";
// Items entering together cascade 70 ms apart, capped so a full row never makes anyone wait.
const STEP_MS = 70;
const MAX_DELAY_MS = 280;

// Reveals content once, as it scrolls into view, inside `rootRef`.
// Everything is visible by default: only targets that start below the fold are hidden, and that happens
// before the browser paints (mutation callbacks run before rendering), so nothing flickers. Content already
// on screen keeps its normal entrance. Without IntersectionObserver, or with reduced motion, nothing is hidden.
export function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const seen = new WeakSet();

    const observer = new IntersectionObserver(
      (entries) => {
        let index = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          observer.unobserve(el);
          el.style.setProperty("--reveal-delay", `${Math.min(index++ * STEP_MS, MAX_DELAY_MS)}ms`);
          el.dataset.revealState = "shown";
          // Settles on "done" once played: no leftover transform under hover effects, and the mount
          // animation from `.stagger` doesn't restart.
          // Nested animations bubble up, so wait for the element's own.
          const done = (event) => {
            if (event.target !== el) return;
            el.removeEventListener("animationend", done);
            el.dataset.revealState = "done";
          };
          el.addEventListener("animationend", done);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    function scan(node) {
      const found = node.matches?.(TARGETS) ? [node] : [];
      found.push(...(node.querySelectorAll?.(TARGETS) ?? []));
      for (const el of found) {
        if (seen.has(el) || el.closest("dialog")) continue;
        seen.add(el);
        // Only hide what is genuinely below the fold right now; zero-size (hidden) elements are left alone.
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.top < window.innerHeight) continue;
        el.dataset.revealState = "hidden";
        observer.observe(el);
      }
    }

    scan(root);
    const mutations = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [rootRef]);
}
