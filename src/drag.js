let selectedElement = null;
let xOffset = 0;
let yOffset = 0;
let hasMoved = false;

let pressTimer;
let longPressDuration;

// Tracks a pending drag before it officially starts
let pendingContainer = null;
let pendingEvent     = null;
let pendingStartX    = 0;
let pendingStartY    = 0;

/** Movement in px required to start a drag immediately (without waiting for long-press) */
const MOVE_THRESHOLD = 12;
const scaleUpTo = 1.08;

export function initDragListener() {
    document.addEventListener('mousedown', handleStart, false);
    document.addEventListener('touchstart', handleStart, { passive: true });

    document.addEventListener('mousemove', dragMove, false);
    document.addEventListener('touchmove', dragMove, { passive: false });

    document.addEventListener('mouseup',  dragEnd, false);
    document.addEventListener('touchend', dragEnd, false);

    longPressDuration = getDuration();
}

function getDuration() {
    return game.settings.get("sheet-only", "dragDuration");
}

function handleStart(event) {
    if (longPressDuration <= 0) return;

    hasMoved = false;

    const container = findAncestor(event.target, '.so-draggable');
    if (!container) return;

    // For popup windows, only drag from the title bar — not from the content
    // area — so that scrolling .window-content isn't hijacked as a window drag.
    if (container.matches('.window-app, .application')) {
        const header = event.target.closest('.window-header, header');
        if (!header || !container.contains(header)) return;
    }

    const touch = event.touches?.[0];
    pendingContainer = container;
    pendingEvent     = event;
    pendingStartX    = touch ? touch.clientX : event.clientX;
    pendingStartY    = touch ? touch.clientY : event.clientY;

    // Long-press fallback: start drag even without movement
    pressTimer = window.setTimeout(() => {
        if (pendingContainer) dragStart(pendingEvent, pendingContainer);
    }, longPressDuration);
}

function findAncestor(el, sel) {
    while ((el = el.parentElement) && !(el.matches || el.matchesSelector).call(el, sel));
    return el;
}

export function wasDragged() {
    return hasMoved;
}

function dragStart(event, container) {
    clearTimeout(pressTimer);
    pendingContainer = null;

    event.preventDefault();
    event.stopPropagation();

    selectedElement = container;
    selectedElement.classList.add('dragged');
    hasMoved = true;

    const { x, y } = getPosition();
    const touch = event.touches?.[0];
    xOffset = (touch ? touch.clientX : event.clientX) - x;
    yOffset = (touch ? touch.clientY : event.clientY) - y;

    selectedElement.style.transform = `translate(${x}px, ${y}px) scale(${scaleUpTo})`;
}

function dragMove(event) {
    const touch = event.touches?.[0];
    const cx = touch ? touch.clientX : event.clientX;
    const cy = touch ? touch.clientY : event.clientY;

    // Start drag immediately if finger has moved far enough
    if (pendingContainer && !selectedElement) {
        const dx = cx - pendingStartX;
        const dy = cy - pendingStartY;
        if (Math.sqrt(dx * dx + dy * dy) >= MOVE_THRESHOLD) {
            dragStart(pendingEvent, pendingContainer);
        }
    }

    if (selectedElement) {
        event.preventDefault();
        event.stopPropagation();

        const xPosition = cx - xOffset;
        const yPosition = cy - yOffset;

        selectedElement.style.transform =
            `translate(${xPosition}px, ${yPosition}px) scale(${scaleUpTo})`;
    }
}

function dragEnd(event) {
    clearTimeout(pressTimer);
    pendingContainer = null;

    if (selectedElement) {
        event.stopPropagation();

        const { x, y } = getPosition();
        selectedElement.style.transform = `translate(${x}px, ${y}px) scale(1)`;
        selectedElement.classList.remove('dragged');
        applyTransformation(selectedElement);
        selectedElement = null;
    }
}

function getPosition() {
    const transform = window.getComputedStyle(selectedElement).transform;
    if (transform && transform !== 'none') {
        const m = new DOMMatrix(transform);
        return { x: m.m41, y: m.m42 };
    }
    return { x: 0, y: 0 };
}

/**
 * Converts the current CSS transform into explicit left/top values so that
 * a Foundry re-render does not snap the element back to its original position.
 * @param {HTMLElement} element
 */
function applyTransformation(element) {
    const style     = getComputedStyle(element);
    const transform = style.transform;

    if (transform !== 'none') {
        const m = new DOMMatrix(transform);
        element.style.transform = 'none';
        element.style.left = `${parseFloat(style.left) + m.m41}px`;
        element.style.top  = `${parseFloat(style.top)  + m.m42}px`;
    }
}
