/**
 * Bridges touch events to Foundry's pointer-based window drag.
 *
 * Foundry registers a `pointerdown` handler on each window header to start
 * dragging.  On touch devices the browser may intercept the touch as a scroll
 * gesture before the pointer event fires, or the synthetic `pointerdown` from
 * a touch may arrive late.  Registering our own `touchstart` listener (which
 * fires first and calls preventDefault) suppresses the scroll and lets Foundry
 * receive a clean pointerdown so its drag logic kicks in immediately.
 *
 * We use event delegation on `document` rather than per-window attachment so
 * new windows are covered automatically without needing a render hook.
 */
export function initWindowDrag() {
    document.addEventListener('touchstart', _onWindowHeaderTouch, { passive: false, capture: true });
}

function _onWindowHeaderTouch(event) {
    if (!event.touches?.length) return;

    // Only match headers belonging to top-level popup windows (direct body
    // children).  Using `body > ` in the selector prevents this from firing
    // for anything nested inside the character sheet (e.g. dnd5e sub-apps).
    const target = event.target;
    const header = target.closest('.window-header, header');
    if (!header) return;

    // Confirm the header's window is a direct child of body, not the sheet
    const win = header.closest('body > .window-app, body > .application');
    if (!win || win.classList.contains('sheet-only-sheet')) return;

    // Do NOT suppress the event if the touch landed on an interactive element
    // (close button, control links, etc.).  Those need to generate a synthetic
    // click so Foundry's action handlers fire.  We only preventDefault for the
    // blank drag-handle area of the header, not for buttons inside it.
    if (target.closest('button, a, input, select, [role="button"]')) return;

    // Suppress scroll so Foundry's pointer drag handler fires immediately
    event.preventDefault();
}
