/**
 * Touch drag and resize for Foundry popup windows.
 *
 * Foundry's built-in drag/resize uses pointer events (pointermove/pointerup)
 * which can be cancelled by the browser on touch devices when it decides a
 * touch is a pan/scroll gesture.  This file owns those interactions for touch:
 *
 * DRAG  – non-".so-draggable" popup windows (drag.js owns .so-draggable).
 *         Reads touchstart to capture initial position, touchmove to update
 *         style.left/top directly.
 *
 * RESIZE – all popup windows.
 *          Reads touchstart on the resize handle, touchmove to update
 *          style.width/height directly.
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

    // Touch drag and resize (passive:false so we can preventDefault on move)
    document.addEventListener('touchstart', _onTouchStart, { passive: false });
    document.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    document.addEventListener('touchend',   _onTouchEnd);
    document.addEventListener('touchcancel', _onTouchEnd);
}

// ---------------------------------------------------------------------------
// Pointer phase – block Foundry's handlers (touch/pen only)
// ---------------------------------------------------------------------------

function _onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    const target = event.target;

    // Resize handle on a popup
    const resizeHandle = target.closest(
        '[data-action="resize"], .window-resizable-handle, .window-resize-handle'
    );
    if (resizeHandle) {
        const win = _popupWindow(resizeHandle);
        if (win) event.stopPropagation(); // block Foundry's resize handler
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

    // ── Resize ───────────────────────────────────────────────────────────────
    const resizeHandle = target.closest(
        '[data-action="resize"], .window-resizable-handle, .window-resize-handle'
    );
    if (resizeHandle) {
        const win = _popupWindow(resizeHandle);
        if (win) {
            event.preventDefault(); // prevent scroll from starting on resize handle
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

    event.preventDefault(); // prevent browser treating this as a pan
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
