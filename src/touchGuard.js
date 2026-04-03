import {isSheetOnly} from "./utils";

/**
 * Explicit registry of popup window elements that need outside-tap protection.
 * Populated via render hooks; entries are lazily cleaned up when the element
 * leaves the DOM.  No DOM queries — no false positives.
 * @type {Set<HTMLElement>}
 */
const _registry = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initTouchGuard() {
    // Intercept pointerdown only.  pointerdown fires before touchstart in the
    // browser event sequence, and it is the event Foundry's ApplicationV2
    // "_onPointerDown" close handler listens to.  Stopping propagation here
    // prevents Foundry from closing the dialog when the user taps outside it,
    // WITHOUT calling preventDefault() — so the browser still generates the
    // synthetic "click" event that character-sheet buttons rely on.
    document.addEventListener('pointerdown', _onOutsideTap, { capture: true });
}

/**
 * Register a rendered application for outside-tap protection.
 * Called from 'render' and 'renderApplicationV2' hooks in index.js.
 *
 * Only true popup windows (direct children of <body>) are registered.
 * Embedded sub-apps (e.g. dnd5e v4 ApplicationV2 section components) are
 * children of the character sheet, not of <body>, so they are excluded.
 * This prevents taps on sheet areas not covered by a sub-app element from
 * being incorrectly blocked.
 *
 * @param {Application|ApplicationV2} app
 */
export function registerWindow(app) {
    if (!isSheetOnly()) return;

    const el = _resolveElement(app);
    if (!el) return;
    if (el.classList.contains('sheet-only-sheet')) return;

    // Popup windows in Foundry are always direct children of <body>.
    // Sub-apps embedded inside the character sheet are NOT, so skip them.
    if (el.parentElement !== document.body) return;

    _registry.add(el);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _onOutsideTap(event) {
    if (!isSheetOnly()) return;

    const dialogs = _getVisible();
    if (!dialogs.length) return;

    // Always pass through to the module's own controls
    if (event.target.closest?.('.sheet-only-container')) return;

    // Pass through if tap is inside any registered dialog
    if (dialogs.some(el => el.contains(event.target))) return;

    // Outside tap while a dialog is open — block Foundry's close handler.
    // stopImmediatePropagation prevents the ApplicationV2 _onPointerDown
    // handler from seeing this event and calling close().
    // We do NOT call preventDefault() so the browser still fires the
    // synthetic "click" event — character-sheet buttons remain interactive
    // even while a popup dialog is visible.
    event.stopImmediatePropagation();
}

function _getVisible() {
    const visible = [];
    for (const el of _registry) {
        if (!document.body.contains(el)) {
            // Window was closed/removed — prune stale entry
            _registry.delete(el);
            continue;
        }
        // Re-check: sheet may have received sheet-only-sheet after registration
        if (el.classList.contains('sheet-only-sheet')) {
            _registry.delete(el);
            continue;
        }
        if (_isOnScreen(el)) visible.push(el);
    }
    return visible;
}

function _isOnScreen(el) {
    const r = el.getBoundingClientRect();
    if (r.width  <= 0 || r.height <= 0)  return false;
    if (r.left  >= window.innerWidth)     return false;
    if (r.right  <= 0)                    return false;
    if (r.top   >= window.innerHeight)    return false;
    if (r.bottom <= 0)                    return false;
    return true;
}

function _resolveElement(app) {
    if (app.element instanceof HTMLElement) return app.element;
    if (app.element?.[0] instanceof HTMLElement) return app.element[0];
    return null;
}
