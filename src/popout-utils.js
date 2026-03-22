/**
 * Prevents a Foundry Application from auto-closing when the user interacts
 * outside it.  Only the window's own close button (or programmatic close with
 * force:true) will actually close the window.
 *
 * Uses a WeakSet guard so calling this multiple times on the same app
 * instance is safe — the close wrapper is installed exactly once.
 *
 * NOTE: touch drag and resize are handled by drag.js / windowDrag.js and
 * CSS touch-action rules; no extra JS is needed here for those.
 *
 * @param {Application|ApplicationV2} app
 */

const _persistent = new WeakSet();

export function makeWindowPersistent(app) {
    if (_persistent.has(app)) return;
    _persistent.add(app);

    const originalClose = app.close.bind(app);
    let userInitiated = false;

    app.close = function (options = {}) {
        if (options.force || userInitiated) {
            userInitiated = false;
            return originalClose(options);
        }
        return Promise.resolve();
    };

    // Mark the close button so tapping it sets userInitiated before the
    // click handler calls app.close().
    _getElement(app).then(el => {
        const closeBtn = el.querySelector(
            '.header-button.close, button[data-action="close"], .window-header [data-action="close"]'
        );
        if (closeBtn) {
            closeBtn.addEventListener('pointerdown', () => {
                userInitiated = true;
            });
        }
    });
}

/**
 * Resolves with the root HTMLElement of a Foundry Application,
 * waiting for it to enter the DOM if needed.
 *
 * @param {Application|ApplicationV2} app
 * @returns {Promise<HTMLElement>}
 */
function _getElement(app) {
    return new Promise(resolve => {
        const el = app.element instanceof HTMLElement
            ? app.element
            : app.element?.[0];

        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const el = app.element instanceof HTMLElement
                ? app.element
                : app.element?.[0];
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}
