import {isSheetOnly} from "./utils";
import {getOwnedActors} from "./actorsList";

export let currentSheet;

export async function onRenderActorSheetV2(app, _sheet, actor) {
    if (currentSheet?.id === app.id || !isSheetOnly()) {
        return;
    }

    currentSheet?.close();
    currentSheet = app;

    app?.setPosition({
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Resolve the root DOM element regardless of Foundry version:
    //   v13 ApplicationV2 → app.element is an HTMLElement
    //   v12 ApplicationV2 → app.element may be an HTMLElement or jQuery-like
    //   v11 Application   → _sheet is a jQuery object
    const rootEl = app.element instanceof HTMLElement ? app.element
        : app.element?.[0] instanceof HTMLElement    ? app.element[0]
        : _sheet    instanceof HTMLElement            ? _sheet
        : null;

    if (rootEl) {
        rootEl.classList.add('sheet-only-sheet');
    } else {
        $(_sheet).addClass('sheet-only-sheet');
    }

    $(".window-resizable-handle").hide();

    getTokenizerImage();
}

export async function onRenderContainerSheet(app, html) {
    if (!isSheetOnly()) {
        return;
    }

    app.setPosition({
        left: window.innerWidth,
        top: 0,
        width: 1, // It will adjust to its minimum width
        height: window.innerHeight // It will adjust to its minimum height
    })
    html.css('z-index', '99999');
}

function getTokenizerImage() {
    let actors = getOwnedActors();
    actors.map(actor => {
        let actorImg = actor.img;
        let sheet = $('#ActorSheet5eCharacter-Actor-' + actor._id)[0];
        if (sheet !== undefined) {
            if (actorImg.includes('tokenizer')
                && actorImg.includes('Avatar')) {
                actorImg = actorImg.replace('Avatar', 'Token');
                $('.sheet-only-container .sheet-header img.profile')[0].src = actorImg;
            }
        }
    });
}