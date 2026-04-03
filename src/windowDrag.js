/**
 * Touch drag and resize for Foundry popup windows.
 *
 * Foundry's built-in drag/resize uses pointer events (pointermove/pointerup)
 * which can be cancelled by the browser on touch devices when it decides a
 * touch is a pan/scroll gesture.  This file owns those interactions for touch:
 *
 * DRAG   – non-".so-draggable" popup windows (drag.js owns .so-draggable).
 *          Touch the title bar to drag; touchmove updates style.left/top.
 *
 * RESIZE – all popup windows via an injected .so-resize-handle at bottom-right.
 *          We inject our own handle so its position is always bottom: 0; right: 0
 *          relative to the window, regardless of where Foundry places its native
 *          resize element.
 *
 * FOUNDRY CONFLICT – Foundry registers pointerdown handlers on headers/resize
 *   handles that start their own drag/resize.  On touch, these run in parallel
 *   with touchmove and fight over position.  We stop their pointerdown in the
 *   capture phase (touch only) so only our touchmove handler runs.
 *
 * PANNING CONFLICT – CSS touch-action:none on headers/handles tells the browser
 *   not to start a pan gesture when the touch begins there.  Without it the
 *   browser fires touchcancel and steals the touch for sheet scrolling.
 *   The CSS must cover both .window-app (ApplicationV1) and .application
 *   (ApplicationV2 / Foundry v13).
 */

/** @type {{ type: 'drag'|'resize', el: HTMLElement, startX: number, startY: number,
 *           startLeft?: number, startTop?: number, startW?: number, startH?: number }|null} */
let _state = null;

export function initWindowDrag() {
    // Block Foundry's pointer-based drag/resize on touch so our touchmove
    // implementation has sole control over window position/size.
    document.addEventListener('pointerdown', _onPointerDown, { capture: true });

    // touchstart is passive: touch-action:none CSS on headers/handles already
    // tells the browser not to scroll there, so we don't need preventDefault().
    // Passive lets the browser start scrolling the sheet content immediately
    // without waiting for this handler, which is critical for landscape mode.
    document.addEventListener('touchstart', _onTouchStart, { passive: true });
    document.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    document.addEventListener('touchend',   _onTouchEnd);
    document.addEventListener('touchcancel', _onTouchEnd);
}

/**
 * Inject a .so-resize-handle into a popup window if one isn't already there.
 * Called from render hooks in index.js so every new popup gets a handle.
 * @param {Application|ApplicationV2} app
 */
export function ensureResizeHandle(app) {
    const el = app.element instanceof HTMLElement ? app.element
        : app.element?.[0] instanceof HTMLElement ? app.element[0]
        : null;
    if (!el) return;

    const win = el.closest('body > .window-app, body > .application') ?? el;
    if (!win || win === document.body) return;
    if (win.classList.contains('sheet-only-sheet')) return;
    if (win.querySelector('.so-resize-handle')) return; // already injected

    const handle = document.createElement('div');
    handle.className = 'so-resize-handle';
    handle.textContent = '⤡';
    win.appendChild(handle);
}

// ---------------------------------------------------------------------------
// Pointer phase – block Foundry's handlers (touch/pen only)
// ---------------------------------------------------------------------------

function _onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    const target = event.target;

    // Our injected resize handle — block Foundry so only our touchmove runs
    if (target.closest('.so-resize-handle')) {
        event.stopPropagation();
        return;
    }

    // Foundry's native resize handles (block those too)
    const resizeHandle = target.closest(
        '[data-action="resize"], .window-resizable-handle, .window-resize-handle'
    );
    if (resizeHandle) {
        const win = _popupWindow(resizeHandle);
        if (win) event.stopPropagation();
        return;
    }

    // Header drag area (not interactive elements)
    if (target.closest('button, a, input, select, [role="button"], [data-action]')) return;
    const header = target.closest('.window-header, header');
    if (!header) return;
    const win = _popupWindow(header);
    if (!win) return;

    // Block Foundry's pointer drag for all popup headers on touch.
    // drag.js owns .so-draggable via touch events; we own the rest.
    event.stopPropagation();
}

// ---------------------------------------------------------------------------
// Touch phase – custom drag / resize
// ---------------------------------------------------------------------------

function _onTouchStart(event) {
    if (!event.touches?.length) return;
    const target = event.target;
    const t = event.touches[0];

    // ── Resize via our injected handle ───────────────────────────────────────
    if (target.closest('.so-resize-handle')) {
        const win = _popupWindow(target);
        if (win) {
            _state = {
                type:   'resize',
                el:     win,
                startX: t.clientX,
                startY: t.clientY,
                startW: win.offsetWidth,
                startH: win.offsetHeight,
            };
        }
        return;
    }

    // ── Drag ─────────────────────────────────────────────────────────────────
    if (target.closest('button, a, input, select, [role="button"], [data-action]')) return;
    const header = target.closest('.window-header, header');
    if (!header) return;
    const win = _popupWindow(header);
    if (!win) return;
    if (win.classList.contains('so-draggable')) return; // drag.js owns these

    _state = {
        type:      'drag',
        el:        win,
        startX:    t.clientX,
        startY:    t.clientY,
        startLeft: win.offsetLeft,
        startTop:  win.offsetTop,
    };
}

function _onTouchMove(event) {
    if (!_state || !event.touches?.length) return;
    event.preventDefault();

    const t = event.touches[0];

    if (_state.type === 'drag') {
        _state.el.style.left = `${_state.startLeft + (t.clientX - _state.startX)}px`;
        _state.el.style.top  = `${_state.startTop  + (t.clientY - _state.startY)}px`;
    } else {
        const newW = Math.max(200, _state.startW + (t.clientX - _state.startX));
        const newH = Math.max(100, _state.startH + (t.clientY - _state.startY));
        _state.el.style.width  = `${newW}px`;
        _state.el.style.height = `${newH}px`;
    }
}

function _onTouchEnd() {
    _state = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the direct-body-child popup window that contains el,
 * or null if el is not inside such a window (or is the sheet itself).
 * @param {HTMLElement} el
 * @returns {HTMLElement|null}
 */
function _popupWindow(el) {
    const win = el.closest('body > .window-app, body > .application');
    if (!win) return null;
    if (win.classList.contains('sheet-only-sheet')) return null;
    return win;
}
