import {actorStorage, saveLastActorId} from "./actorStorage.js";
import {getUserData} from "./utils";


export function rebuildActorList() {
    let actorList = $('.sheet-only-actor-list');

    displayActorListButton();

    actorList.empty();
    let actorElements = getActorElements();

    actorList.show();
    actorElements.forEach(elem => actorList.append(elem));
}

export function displayActorListButton() {
    const actorsListButton = $("#so-collapse-actor-select")
    const ownedActors = getOwnedActors();

    if (ownedActors.length > 1) {
        actorsListButton.show();
    } else {
        actorsListButton.hide();
    }
}

export function getOwnedActors() {
    return game.actors.filter(actor => isActorOwnedByUser(actor));
}

export function isActorOwnedByUser(actor) {
    const userData = getUserData();

    if (userData?.allowObserver) {
        return actor.ownership[game.user.id] >= 2
    } else {
        return actor.ownership[game.user.id] === 3
    }
}

export function getActorElements() {
    let actors = getOwnedActors();
    return actors.map(actor => {
            return $('<div>')
                //.text(actor.name)
                .append($('<img>').attr('src', actor.img))
                .click(async () => {
                    await switchToActor(actor);
                    toggleActorList();
                });
        }
    );
}

/**
 * @param {Actor} actor
 */
export async function switchToActor(actor, render = true) {
    actorStorage.current = actor;
    if (render) await actor.sheet.render(true);

    setCurrentActorTokenAsControlled(actor);
    saveLastActorId(actorStorage.current.id);
}

// Take control of the token of this actor (for targeting)
function setCurrentActorTokenAsControlled() {
    if (actorStorage.current) {
        const activeTokens = actorStorage.current.getActiveTokens();
        if (activeTokens.length > 0) {
            activeTokens[0].control({releaseOthers: true})
        }
    }
}

export function toggleActorList() {
    const list = $('.sheet-only-actor-list');
    list.toggleClass('collapse');

    const isOpen = !list.hasClass('collapse');
    localStorage.setItem("collapsed-actor-select", isOpen ? "false" : "true");

    if (isOpen) {
        setTimeout(() => {
            // Use 'click' instead of 'pointerdown' so the touchGuard's
            // stopImmediatePropagation() on pointerdown doesn't prevent this
            // handler from firing when a popup dialog is open.
            $(document).one('click', function (e) {
                if (!$(e.target).closest('.sheet-only-actor-list').length &&
                    !$(e.target).closest('#so-collapse-actor-select').length) {
                    list.addClass('collapse');
                    localStorage.setItem("collapsed-actor-select", "true");
                }
            });
        }, 0);
    }
}