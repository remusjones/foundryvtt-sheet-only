/**
 * Prevents a Foundry Application from auto-closing.
 * The window will only close when the user explicitly clicks its close button.
 *
 * @param {Application|ApplicationV2} app
 */
export function makeWindowPersistent(app) {
    const originalClose = app.close.bind(app);
    let userInitiated = false;

    app.close = function (options = {}) {
        if (userInitiated) {
            userInitiated = false;
            return originalClose(options);
        }
        return Promise.resolve();
    };

    // Hook the close button once the element is in the DOM
    getElement(app).then(el => {
        const closeBtn = el.querySelector(
            '.header-button.close, button[data-action="close"], .window-header [data-action="close"]'
        );
        if (closeBtn) {
            closeBtn.addEventListener('pointerdown', () => {
                userInitiated = true;
            });
        }

        addTouchResize(app, el);
    });
}

/**
 * Adds touch-friendly drag and resize support to a popout window.
 *
 * @param {Application|ApplicationV2} app
 * @param {HTMLElement} el
 */
export function addTouchResize(app, el) {
    // ── Touch resize via the resize handle ──────────────────────────────────
    const handle = el.querySelector('.window-resizable-handle');
    if (handle) {
        let startX, startY, startW, startH;

        handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
        }, { passive: false });

        handle.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            const newW = Math.max(200, startW + (t.clientX - startX));
            const newH = Math.max(100, startH + (t.clientY - startY));
            el.style.width  = `${newW}px`;
            el.style.height = `${newH}px`;
        }, { passive: false });

        handle.addEventListener('touchend', () => {
            app.setPosition?.({ width: el.offsetWidth, height: el.offsetHeight });
        });
    }

    // ── Touch drag via the window header ────────────────────────────────────
    const header = el.querySelector('.window-header, header');
    if (header) {
        let dragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('touchstart', (e) => {
            // Ignore taps on buttons inside the header
            if (e.target.closest('button, a')) return;
            const t = e.touches[0];
            startX    = t.clientX;
            startY    = t.clientY;
            startLeft = el.offsetLeft;
            startTop  = el.offsetTop;
            dragging  = true;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            e.preventDefault();
            const t = e.touches[0];
            const newLeft = startLeft + (t.clientX - startX);
            const newTop  = startTop  + (t.clientY - startY);
            el.style.left = `${newLeft}px`;
            el.style.top  = `${newTop}px`;
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (!dragging) return;
            dragging = false;
            app.setPosition?.({ left: el.offsetLeft, top: el.offsetTop });
        });
    }
}

/**
 * Resolves with the root HTMLElement of a Foundry Application,
 * waiting for it to be rendered into the DOM if needed.
 *
 * @param {Application|ApplicationV2} app
 * @returns {Promise<HTMLElement>}
 */
function getElement(app) {
    return new Promise(resolve => {
        // ApplicationV2 exposes element as a plain HTMLElement
        // ApplicationV1 exposes element as a jQuery object
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
