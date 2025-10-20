function i18n(key) {
  return game.i18n.localize(key);
}
function getUserData() {
  let playerdata = game.settings.get("sheet-only", "playerdata");
  return playerdata[game.user.id];
}
function isSheetOnly() {
  let userData = getUserData();
  if (userData) {
    const useSheetOnly = userData.display;
    if (useSheetOnly) {
      const screenWidthToIgnoreSheetOnly = userData.screenwidth;
      if (screenWidthToIgnoreSheetOnly <= 0) {
        return true;
      }
      if (screen.width < screenWidthToIgnoreSheetOnly) {
        return true;
      }
    }
  }
  return false;
}
let renderedApp;
async function renderOnSidebar(app) {
  if (renderedApp && renderedApp.id !== app.id) {
    await renderedApp.close();
  }
  renderedApp = app;
  const sheetOnlySheet = document.getElementsByClassName("sheet-only-sheet")[0];
  addListener$2(sheetOnlySheet);
  modifySheetSize(sheetOnlySheet);
}
function addListener$2(sheetOnlySheet) {
  if (!sheetOnlySheet) return;
  renderedApp.addEventListener("close", () => {
    renderedApp = void 0;
    if (sheetOnlySheet) {
      sheetOnlySheet.style.width = "100%";
      sheetOnlySheet.style.maxWidth = "100%";
    }
  });
}
function modifySheetSize(sheetOnlySheet) {
  if (!sheetOnlySheet) return;
  console.warn(window.innerWidth, renderedApp.element.offsetWidth);
  sheetOnlySheet.style.width = window.innerWidth - renderedApp.element.offsetWidth + "px";
  sheetOnlySheet.style.maxWidth = window.innerWidth - renderedApp.element.offsetWidth + "px";
}
let chatPopout;
function popoutChat() {
  const chatTabElement = document.querySelector("#chat");
  if (chatTabElement && window.ui) {
    const tabApp = window.ui[chatTabElement.dataset.tab];
    if (tabApp && typeof tabApp.renderPopout === "function") {
      tabApp.renderPopout().then((popout) => {
        chatPopout = popout;
        chatPopout.classList.add("so-draggable");
        if (window.innerWidth > 800) {
          renderOnSidebar(popout);
        }
        addListener$1();
        const chatFullscreen = game.settings.get(moduleId, "chat-fullscreen");
        updateChatFullscreen(chatFullscreen, chatPopout);
      });
    } else {
      console.error("The popout or renderPopout function is not available.");
    }
  } else {
    console.error("Chat tab element or ui object not found.");
  }
}
function addListener$1() {
  chatPopout.addEventListener("close", () => {
    chatPopout = void 0;
  });
}
function openChat() {
  if (!chatPopout) {
    popoutChat();
  }
}
function closeChat() {
  if (chatPopout) {
    chatPopout.close();
    chatPopout = void 0;
  }
}
function toggleChat() {
  if (chatPopout) {
    closeChat();
  } else {
    popoutChat();
  }
}
function updateChatFullscreen(fullscreen, chatPopout2) {
  if (!isSheetOnly()) return;
  chatPopout2.element.style.zIndex = 9999;
  if (fullscreen) {
    chatPopout2.setPosition({
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    });
    chatPopout2.classList.remove("so-draggable");
  } else {
    chatPopout2.setPosition({
      left: window.innerWidth,
      top: 0
    });
    chatPopout2.classList.add("so-draggable");
  }
}
const actorStorage = {
  current: null
};
function saveLastActorId(actorId) {
  game.settings.set("sheet-only", "lastActorId", actorId);
}
function getLastActorId() {
  return game.settings.get("sheet-only", "lastActorId");
}
function dnd5eReadyHook() {
  if (!isDnd5e()) {
    return;
  }
  document.body.addEventListener("click", onActivate, true);
  Hooks.on("renderChatMessage", handleChatMessage);
}
function isDnd5e() {
  return game.system.id === "dnd5e";
}
function handleChatMessage(message, _html, messageData) {
  const shouldOpenChat = game.settings.get(moduleId, "open-chat-on-item-use");
  if (!shouldOpenChat) return;
  if (!messageData.author.isSelf) return;
  const useFlag = message.getFlag("dnd5e", "use");
  if (!useFlag) return;
  openChat();
  game.messages.directory.scrollBottom();
}
function onActivate(event) {
  let element = event.target;
  while (element) {
    if (element.hasAttribute("data-tooltip-class")) {
      game.tooltip.activate(element);
      break;
    }
    element = element.parentElement;
  }
}
function onTransformActor(fromActor, toActor) {
  var _a;
  if (!isSheetOnly()) {
    return;
  }
  if (((_a = actorStorage.current) == null ? void 0 : _a.id) === fromActor.id) {
    actorStorage.current = toActor;
  }
}
const moduleId = "sheet-only";
const registerSettings = () => {
  game.settings.registerMenu(moduleId, "settingsMenu", {
    name: i18n("Sheet-Only.settingsMenu.name"),
    label: i18n("Sheet-Only.settingsMenu.label"),
    hint: i18n("Sheet-Only.settingsMenu.hint"),
    icon: "fas fa-users",
    type: PlayerSelectionMenu,
    restricted: true
  });
  game.settings.register(moduleId, "display-notifications", {
    name: i18n("Sheet-Only.display-notifications.name"),
    hint: i18n("Sheet-Only.display-notifications.hint"),
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });
  game.settings.register(moduleId, "chat-fullscreen", {
    name: i18n("Sheet-Only.chat-full-width.name"),
    hint: i18n("Sheet-Only.chat-full-width.hint"),
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: false,
    onChange: (value) => {
      updateChatFullscreen(value);
    }
  });
  game.settings.register(moduleId, "open-chat-on-item-use", {
    name: i18n("Sheet-Only.open-chat-on-item-use.name"),
    hint: i18n("Sheet-Only.open-chat-on-item-use.hint"),
    scope: "client",
    config: isDnd5e(),
    default: true,
    type: Boolean,
    requiresReload: false
  });
  game.settings.register(moduleId, "canvas-option", {
    name: i18n("Sheet-Only.canvas-option.name"),
    hint: i18n("Sheet-Only.canvas-option.hint"),
    scope: "client",
    config: true,
    type: String,
    choices: {
      "No-Control": "No Control",
      "Hidden": "Hide",
      "Disabled": "Disable"
    },
    default: "Disabled",
    requiresReload: true
  });
  game.settings.register(moduleId, "dragDuration", {
    name: i18n("Sheet-Only.drag.name"),
    hint: i18n("Sheet-Only.drag.hint"),
    scope: "client",
    config: true,
    type: Number,
    requiresReload: true,
    default: 500
  });
  game.settings.register(moduleId, "lastActorId", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });
  game.settings.register(moduleId, "neverAskCanvas", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.register(moduleId, "playerdata", {
    scope: "world",
    config: false,
    default: {},
    type: Object
  });
  game.settings.register(moduleId, "show-bottom-bar", {
    name: i18n("Sheet-Only.show-bottom-bar.name"),
    hint: i18n("Sheet-Only.show-bottom-bar.hint"),
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true
  });
  volumeSettings();
};
function volumeSettings() {
  game.settings.register(moduleId, "volume_playlist", {
    name: i18n("Sheet-Only.volume.playlist.name"),
    scope: "client",
    config: true,
    range: { min: 0, max: 1, step: 0.1 },
    type: Number,
    default: 0.8,
    onChange: (value) => {
      game.settings.set("core", "globalPlaylistVolume", value);
    }
  });
  game.settings.register(moduleId, "volume_ambience", {
    name: i18n("Sheet-Only.volume.ambience.name"),
    scope: "client",
    config: true,
    range: { min: 0, max: 1, step: 0.1 },
    type: Number,
    default: 0.8,
    onChange: (value) => {
      game.settings.set("core", "globalAmbientVolume", value);
    }
  });
  game.settings.register(moduleId, "volume_interface", {
    name: i18n("Sheet-Only.volume.interface.name"),
    scope: "client",
    config: true,
    range: { min: 0, max: 1, step: 0.1 },
    type: Number,
    default: 0.8,
    onChange: (value) => {
      game.settings.set("core", "globalInterfaceVolume", value);
    }
  });
}
class PlayerSelectionMenu extends FormApplication {
  constructor(options = {}) {
    super(options);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sheet-only",
      title: "Sheet-Only",
      template: "./modules/sheet-only/templates/controller.html",
      width: 500,
      height: "auto",
      popOut: true
    });
  }
  getData(options) {
    let playerdata = game.settings.get("sheet-only", "playerdata");
    let players = game.users.filter((u) => !u.isGM).map((u) => {
      let data = playerdata[u.id] || {};
      return foundry.utils.mergeObject({
        id: u.id,
        name: u.name,
        img: u.avatar,
        display: false,
        mobile: false,
        screenwidth: 0,
        mirror: false,
        selection: false
      }, data);
    });
    return {
      players
    };
  }
  saveData() {
    let playerdata = game.settings.get("sheet-only", "playerdata");
    $(".item-list .item", this.element).each(function() {
      let id = this.dataset.itemId;
      let data = playerdata[id] || {};
      data.display = $(".display", this).is(":checked");
      data.mobile = $(".mobile", this).is(":checked");
      data.screenwidth = $(".screenwidth", this).val() || 0;
      data.allowObserver = $(".allowObserver", this).is(":checked");
      playerdata[id] = data;
    });
    game.settings.set("sheet-only", "playerdata", playerdata);
    this.close();
  }
  activateListeners(html) {
    super.activateListeners(html);
    $(".dialog-buttons.save", html).click($.proxy(this.saveData, this));
  }
}
function onInit() {
  registerSettings();
}
function setupApi() {
  game.modules.get("sheet-only").api = {
    // This sheet-only version is compatible with the following sheet-only-plus version
    plusCompatibility: "1.2.2",
    getCurrentActor: function() {
      return actorStorage.current;
    },
    isSheetOnly: function() {
      return isSheetOnly();
    }
  };
}
function hideCanvas() {
  checkDnd5e();
}
function checkDnd5e() {
  if (game.system === "dnd5e" || document.getElementById("board")) {
    document.body.classList.add("hidden-canvas");
  }
}
async function onSetup() {
  if (!isSheetOnly()) {
    return;
  }
  await setupClient();
  setupApi();
}
async function setupClient() {
  controlCanvas();
}
function controlCanvas() {
  const setting = game.settings.get("sheet-only", "canvas-option");
  const coreIsDisabled = game.settings.get("core", "noCanvas");
  if (setting === "Disabled" && !coreIsDisabled) {
    game.settings.set("core", "noCanvas", true);
    foundry.utils.debouncedReload();
  } else if (setting === "Hidden") {
    hideCanvas();
    if (coreIsDisabled) {
      game.settings.set("core", "noCanvas", false);
      foundry.utils.debouncedReload();
    }
  }
}
function showPatreonDialog(titleSuffix) {
  let dialogContent = `<p>This is a Sheet-only-PLUS feature.</p> 
                <p>Please visit: <a href="https://www.patreon.com/SyriousWorkshop" target="_blank">Syrious' Workshop on Patreon</a></p>`;
  new Dialog({
    title: "Patreon Only Feature - " + titleSuffix,
    content: dialogContent,
    buttons: {
      ok: {
        icon: "<i class='fas fa-check'></i>",
        label: "Ok"
      }
    }
  }).render(true);
}
function enableCanvasDialog() {
  let dialogContent = `<p>Sheet-Only is not active for you but your canvas is disabled.</p> 
                <p>Should the canvas be activated for you?</p>`;
  new Dialog({
    title: "Enable canvas?",
    content: dialogContent,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: "Yes",
        callback: () => {
          game.settings.set("core", "noCanvas", false);
          foundry.utils.debouncedReload();
        }
      },
      no: {
        icon: "<i class='fas fa-xmark'></i>",
        label: "No"
      },
      no_never: {
        icon: "<i class='fas fa-xmark'></i>",
        label: "No, don't ask again!",
        callback: () => {
          game.settings.set(moduleId, "neverAskCanvas", true);
        }
      }
    },
    default: "yes"
  }).render(true, { width: 500 });
}
function rebuildActorList() {
  let actorList = $(".sheet-only-actor-list");
  displayActorListButton();
  actorList.empty();
  let actorElements = getActorElements();
  actorList.show();
  actorElements.forEach((elem) => actorList.append(elem));
}
function displayActorListButton() {
  const actorsListButton = $("#so-collapse-actor-select");
  const ownedActors = getOwnedActors();
  if (ownedActors.length > 1) {
    actorsListButton.show();
  } else {
    actorsListButton.hide();
  }
}
function getOwnedActors() {
  return game.actors.filter((actor) => isActorOwnedByUser(actor));
}
function isActorOwnedByUser(actor) {
  const userData = getUserData();
  if (userData == null ? void 0 : userData.allowObserver) {
    return actor.ownership[game.user.id] >= 2;
  } else {
    return actor.ownership[game.user.id] === 3;
  }
}
function getActorElements() {
  let actors = getOwnedActors();
  return actors.map(
    (actor) => {
      return $("<div>").append($("<img>").attr("src", actor.img)).click(async () => {
        await switchToActor(actor);
        toggleActorList();
      });
    }
  );
}
async function switchToActor(actor, render = true) {
  actorStorage.current = actor;
  if (render) await actor.sheet.render(true);
  setCurrentActorTokenAsControlled();
  saveLastActorId(actorStorage.current.id);
}
function setCurrentActorTokenAsControlled() {
  if (actorStorage.current) {
    const activeTokens = actorStorage.current.getActiveTokens();
    if (activeTokens.length > 0) {
      activeTokens[0].control({ releaseOthers: true });
    }
  }
}
function toggleActorList() {
  $(".sheet-only-actor-list").toggleClass("collapse");
  if ($(".sheet-only-actor-list.collapse")) {
    localStorage.setItem("collapsed-actor-select", "true");
  } else {
    localStorage.setItem("collapsed-actor-select", "false");
  }
}
let selectedElement = null;
let xOffset = 0;
let yOffset = 0;
let hasMoved = false;
let pressTimer;
let longPressDuration;
const scaleUpTo = 1.08;
function initDragListener() {
  document.addEventListener("mousedown", handleStart, false);
  document.addEventListener("touchstart", handleStart, false);
  document.addEventListener("mousemove", dragMove, false);
  document.addEventListener("touchmove", dragMove, false);
  document.addEventListener("mouseup", dragEnd, false);
  document.addEventListener("touchend", dragEnd, false);
  longPressDuration = getDuration();
}
function getDuration() {
  return game.settings.get("sheet-only", "dragDuration");
}
function handleStart(event) {
  if (longPressDuration <= 0) return;
  hasMoved = false;
  let container = findAncestor(event.target, ".so-draggable");
  if (container) {
    pressTimer = window.setTimeout(() => dragStart(event, container), longPressDuration);
  }
}
function findAncestor(el, sel) {
  while ((el = el.parentElement) && !(el.matches || el.matchesSelector).call(el, sel)) ;
  return el;
}
function wasDragged() {
  return hasMoved;
}
function dragStart(event, container) {
  event.preventDefault();
  event.stopPropagation();
  selectedElement = container;
  selectedElement.classList.add("dragged");
  hasMoved = true;
  let { x, y } = getPosition();
  xOffset = (event.clientX || event.touches[0].clientX) - x;
  yOffset = (event.clientY || event.touches[0].clientY) - y;
  selectedElement.style.transform = `translate(${x}px, ${y}px) scale(${scaleUpTo})`;
}
function dragMove(event) {
  if (selectedElement) {
    event.stopPropagation();
    let xPosition = (event.clientX || event.touches[0].clientX) - xOffset;
    let yPosition = (event.clientY || event.touches[0].clientY) - yOffset;
    selectedElement.style.transform = `translate(${xPosition}px, ${yPosition}px) scale(${scaleUpTo})`;
  }
}
function dragEnd(event) {
  clearTimeout(pressTimer);
  if (selectedElement) {
    event.stopPropagation();
    let { x, y } = getPosition();
    selectedElement.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    selectedElement.classList.remove("dragged");
    applyTransformation(selectedElement);
    selectedElement = null;
  }
}
function getPosition() {
  const elementStyle = window.getComputedStyle(selectedElement);
  const transform = elementStyle.transform;
  let xPosition = 0;
  let yPosition = 0;
  if (transform && transform !== "none") {
    const matrix = new WebKitCSSMatrix(transform);
    xPosition = matrix.m41;
    yPosition = matrix.m42;
  }
  return { x: xPosition, y: yPosition };
}
function applyTransformation(element) {
  const computedStyle = getComputedStyle(element);
  const transform = computedStyle.transform;
  if (transform !== "none") {
    const matrix = transform.match(/matrix\(([^)]+)\)/)[1].split(", ").map(parseFloat);
    const translateX = matrix[4];
    const translateY = matrix[5];
    const translatedLeft = parseFloat(computedStyle.left) + translateX;
    const translatedTop = parseFloat(computedStyle.top) + translateY;
    element.style.transform = "none";
    element.style.left = `${translatedLeft}px`;
    element.style.top = `${translatedTop}px`;
  }
}
function enable() {
  const element = document.body;
  const requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.mozRequestFullScreen || element.msRequestFullscreen;
  if (requestMethod) {
    requestMethod.call(element);
  } else if (typeof window.ActiveXObject !== "undefined") {
    const wscript = new ActiveXObject("WScript.Shell");
    if (wscript !== null) {
      wscript.SendKeys("{F11}");
    }
  }
}
function disable() {
  const element = document;
  const exitMethod = element.exitFullscreen || element.webkitExitFullscreen || element.mozCancelFullScreen || element.msExitFullscreen;
  if (exitMethod) {
    exitMethod.call(document);
  } else if (typeof window.ActiveXObject !== "undefined") {
    const wscript = new ActiveXObject("WScript.Shell");
    if (wscript !== null) {
      wscript.SendKeys("{F11}");
    }
  }
}
function toggleFullscreen() {
  const isInFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (isInFullScreen) {
    disable();
  } else {
    enable();
  }
}
function sheetOnlyPlusActive() {
  let moduleName = "sheet-only-plus";
  return game.modules.has(moduleName) && game.modules.get(moduleName).active;
}
let journalPopout;
function onRenderJournalDirectory(app, html) {
  if (isSheetOnly()) {
    app.setPosition({
      left: window.innerWidth,
      top: 0,
      zIndex: 9999
    });
    app.classList.add("so-draggable");
  }
}
function openJournal() {
  var _a;
  (_a = game.journal.apps[0]) == null ? void 0 : _a.renderPopout().then((journalApp) => {
    journalPopout = journalApp;
    journalPopout.classList.add("so-draggable");
    if (window.innerWidth > 800) {
      renderOnSidebar(journalPopout);
    }
    addListener();
  });
}
function addListener() {
  journalPopout.addEventListener("close", () => {
    journalPopout = void 0;
  });
}
function toggleJournal() {
  if (journalPopout) {
    closeJournal();
  } else {
    openJournal();
  }
}
function closeJournal() {
  if (journalPopout) {
    journalPopout.close();
  }
}
function useSmallScreenSettings() {
  const maxWithForSmallDisplays = 800;
  const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const showBottomBar = game.settings.get("sheet-only", "show-bottom-bar");
  const isSmallScreen = screenWidth < maxWithForSmallDisplays;
  return isSmallScreen && showBottomBar;
}
function checkAndSetupSmallScreen() {
  if (useSmallScreenSettings()) {
    $("#so-main-buttons").addClass("small-display");
    $(".sheet-only-container").addClass("small-display");
    const observer = new MutationObserver(() => {
      if ($(".sheet-only-sheet").length > 0) {
        $(".sheet-only-sheet").addClass("small-display");
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
function addControlButtons(sheetContainer, increaseZoom2, decreaseZoom2, resetZoom2) {
  const buttonContainer = $(`<div class="button-container so-draggable"></div>`);
  buttonContainer.load("modules/sheet-only/templates/buttons.html", () => {
    setupDefaultButtons(buttonContainer, increaseZoom2, decreaseZoom2, resetZoom2);
    setupMenuButtons(buttonContainer);
    checkAndSetupSmallScreen();
  });
  sheetContainer.append(buttonContainer);
  setupDefaults();
  initDragListener();
}
function setupMenuButtons(buttonContainer) {
  const menuButton = buttonContainer.find("#so-menu");
  menuButton.on("click", function() {
    if (wasDragged()) return;
    $("#so-main-buttons").toggle();
    $("#so-settings-buttons").toggle();
  });
}
function setupDefaultButtons(buttonContainer, increaseZoom2, decreaseZoom2, resetZoom2) {
  const collapseButton = buttonContainer.find("#so-collapse-actor-select");
  const chatButton = buttonContainer.find("#so-toggle-chat");
  const increaseButton = buttonContainer.find("#so-increase-font");
  const decreaseButton = buttonContainer.find("#so-decrease-font");
  const resetButton = buttonContainer.find("#so-reset-font");
  const logoutButton = buttonContainer.find("#so-log-out");
  const targetingButton = buttonContainer.find("#so-targeting");
  const journalButton = buttonContainer.find("#so-journal");
  const controllingButton = buttonContainer.find("#so-controlling");
  const settingsButton = buttonContainer.find("#so-fvtt-settings");
  const fullscreen = buttonContainer.find("#so-fullscreen");
  collapseButton.on("click", function() {
    if (wasDragged()) return;
    toggleActorList();
  });
  chatButton.on("click", function() {
    if (wasDragged()) return;
    toggleChat();
  });
  increaseButton.on("click", function() {
    if (wasDragged()) return;
    increaseZoom2();
  });
  decreaseButton.on("click", function() {
    if (wasDragged()) return;
    decreaseZoom2();
  });
  resetButton.on("click", function() {
    if (wasDragged()) return;
    resetZoom2();
  });
  logoutButton.on("click", function() {
    if (wasDragged()) return;
    ui.menu.items.logout.onClick();
  });
  settingsButton.on("click", function() {
    if (wasDragged()) return;
    game.settings.sheet.render(true);
  });
  targetingButton.on("click", function() {
    if (wasDragged()) return;
    if (sheetOnlyPlusActive()) {
      game.modules.get("sheet-only-plus").api.openTargeting();
    } else {
      showPatreonDialog("Targeting");
    }
  });
  journalButton.on("click", function() {
    if (wasDragged()) return;
    toggleJournal();
  });
  controllingButton.on("click", function() {
    if (wasDragged()) return;
    if (sheetOnlyPlusActive()) {
      game.modules.get("sheet-only-plus").api.openControls();
    } else {
      showPatreonDialog("Movement");
    }
  });
  fullscreen.on("click", function() {
    if (wasDragged()) return;
    toggleFullscreen();
  });
  displayActorListButton();
}
function setupDefaults() {
  $("#collapse-actor-select i").addClass("hidden");
  $(".sheet-only-actor-list").addClass("collapse");
}
function increaseZoom$1() {
  const max = game.settings.settings.get("core.fontSize").range.max;
  const currentFontSize = game.settings.get("core", "fontSize");
  let newFontSize = currentFontSize + 1;
  if (newFontSize > max) {
    newFontSize = max;
  }
  game.settings.set("core", "fontSize", newFontSize);
}
function decreaseZoom$1() {
  const min = game.settings.settings.get("core.fontSize").range.min;
  const currentFontSize = game.settings.get("core", "fontSize");
  let newFontSize = currentFontSize - 1;
  if (newFontSize < min) {
    newFontSize = min;
  }
  game.settings.set("core", "fontSize", newFontSize);
}
function resetZoom$1() {
  const defaultFontSize = game.settings.settings.get("core.fontSize").default;
  game.settings.set("core", "fontSize", defaultFontSize);
}
function increaseZoom() {
  let sheet = $(".sheet-only-sheet");
  let scaleFactor = parseFloat(sheet.css("zoom"));
  scaleFactor += 0.1;
  sheet.css({ zoom: scaleFactor });
}
function decreaseZoom() {
  let sheet = $(".sheet-only-sheet");
  let scaleFactor = parseFloat(sheet.css("zoom"));
  scaleFactor = Math.max(scaleFactor - 0.1, 0.1);
  sheet.css({ zoom: scaleFactor });
}
function resetZoom() {
  let sheet = $(".sheet-only-sheet");
  sheet.css({ zoom: 1 });
}
async function popupSheet$1() {
  const ownedActors = getOwnedActors();
  const lastActorId = getLastActorId();
  if (lastActorId) {
    const lastActor = game.actors.get(lastActorId);
    const actorIsOwned = ownedActors.some((actor) => actor.id === lastActorId);
    if (lastActor && actorIsOwned) {
      await switchToActor(lastActor);
      return;
    } else {
      console.log("The saved actor could not be found, opening the first actor.");
    }
  }
  if ((ownedActors == null ? void 0 : ownedActors.length) > 0) {
    await switchToActor(ownedActors[0]);
  } else {
    console.error("No actor for user found.");
  }
}
let currentSheet;
async function onRenderActorSheetV2(app, _sheet, actor) {
  if ((currentSheet == null ? void 0 : currentSheet.id) === app.id || !isSheetOnly()) {
    return;
  }
  currentSheet == null ? void 0 : currentSheet.close();
  currentSheet = app;
  app == null ? void 0 : app.setPosition({
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight
  });
  if (app.classList) {
    app.classList.add("sheet-only-sheet");
  } else {
    _sheet.addClass("sheet-only-sheet");
  }
  $(".window-resizable-handle").hide();
  getTokenizerImage();
}
async function onRenderContainerSheet(app, html) {
  if (!isSheetOnly()) {
    return;
  }
  app.setPosition({
    left: window.innerWidth,
    top: 0,
    width: 1,
    // It will adjust to its minimum width
    height: window.innerHeight
    // It will adjust to its minimum height
  });
  html.css("z-index", "99999");
}
function getTokenizerImage() {
  let actors = getOwnedActors();
  actors.map((actor) => {
    let actorImg = actor.img;
    let sheet = $("#ActorSheet5eCharacter-Actor-" + actor._id)[0];
    if (sheet !== void 0) {
      if (actorImg.includes("tokenizer") && actorImg.includes("Avatar")) {
        actorImg = actorImg.replace("Avatar", "Token");
        $(".sheet-only-container .sheet-header img.profile")[0].src = actorImg;
      }
    }
  });
}
async function onReady() {
  if (!isSheetOnly()) {
    const canvasDisabled = game.settings.get("core", "noCanvas");
    const neverAsk = game.settings.get(moduleId, "neverAskCanvas");
    if (canvasDisabled && !neverAsk) {
      enableCanvasDialog();
    }
    return;
  }
  await userInitialization();
  setupContainer();
  rebuildActorList();
  await popupSheet$1();
  hideUnusedElements();
  addEventListener("resize", onResize);
  dnd5eReadyHook();
}
function setupContainer() {
  const sheetContainer = $("<div>").addClass("sheet-only-container");
  $("body").append(sheetContainer);
  sheetContainer.append(
    $("<div>").css({ "padding-top": "40px" }).addClass("sheet-only-actor-list").attr("id", "sheet-only-actor-list")
  );
  if (navigator.userAgent.indexOf("Firefox") !== -1) {
    console.log("Adding font-size buttons for firefox");
    addControlButtons(sheetContainer, increaseZoom$1, decreaseZoom$1, resetZoom$1);
  } else {
    console.log("Adding zoom buttons");
    addControlButtons(sheetContainer, increaseZoom, decreaseZoom, resetZoom);
  }
}
function hideUnusedElements() {
  $("#interface").addClass("sheet-only-hide");
  $("#pause").addClass("sheet-only-hide");
  $("#tooltip").addClass("sheet-only-hide");
  if (!game.settings.get("sheet-only", "display-notifications")) {
    $("#notifications").addClass("sheet-only-hide");
  }
}
function userInitialization() {
  return new Promise((resolve, reject) => {
    let count = 0;
    const checkApiInterval = setInterval(() => {
      if (count % 10 === 0) {
        ui.notifications.info(i18n("Sheet-Only.display-notifications.wait-init"));
      }
      const ownedActors = getOwnedActors();
      if (ownedActors && ownedActors.length > 0) {
        ui.notifications.info(i18n("Sheet-Only.notifications.ownedActorFound"));
        clearInterval(checkApiInterval);
        resolve();
      } else if (count >= 500) {
        ui.notifications.error(i18n("Sheet-Only.notifications.actorInitError"));
        clearInterval(checkApiInterval);
        reject(new Error("Could not initialize actor."));
      } else {
        count++;
      }
    }, 500);
  });
}
function onResize(event) {
  currentSheet == null ? void 0 : currentSheet.setPosition({
    width: window.innerWidth,
    height: window.innerHeight
  });
}
async function onCreateActor(actor) {
  if (!isSheetOnly()) {
    return;
  }
  if (isActorOwnedByUser(actor)) {
    rebuildActorList();
    await switchToActor(actor);
  }
}
async function onDeleteActor(actor) {
  if (!isSheetOnly()) {
    return;
  }
  if (isActorOwnedByUser(actor)) {
    rebuildActorList();
    if (actor === actorStorage.current) {
      await popupSheet();
    }
  }
}
async function onCloseUserConfig() {
  if (!isSheetOnly()) {
    return;
  }
  await popupSheet$1();
}
async function onRenderSettingsConfig(app, element, settings) {
  if (!isSheetOnly()) {
    return;
  }
  app.setPosition({ zIndex: 2e3 });
  if (window.innerWidth < 600) {
    app.setPosition({
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight
    });
    const content = element.querySelector(".window-content");
    if (content) {
      content.style.flexDirection = "column";
      content.style.overflowY = "auto";
      content.style.maxHeight = "100vh";
    }
  }
}
function integrateLame(htmlPassed) {
  const html = htmlPassed instanceof jQuery ? htmlPassed[0] : htmlPassed;
  if (html.querySelector("#lame-messenger-button")) {
    return;
  }
  const lameInstance = game.modules.get("lame-messenger").instance;
  const lameButton = lameInstance.chatbarButton;
  lameButton.addEventListener("click", () => lameInstance.bringToFront());
  const chatControlBar = document.getElementById("chat-controls");
  chatControlBar.appendChild(lameButton);
}
Hooks.on("init", async () => {
  onInit();
});
Hooks.on("setup", async () => {
  await onSetup();
});
Hooks.on("renderChatLog", async (_app, htmlPassed, _data_ChatInput) => {
  var _a;
  if ((_a = game.modules.get("lame-messenger")) == null ? void 0 : _a.active) {
    integrateLame(htmlPassed);
  }
});
Hooks.once("ready", async function() {
  await onReady();
});
Hooks.on("dnd5e.transformActor", async (fromActor, toActor) => {
  onTransformActor(fromActor, toActor);
});
Hooks.on("renderActorSheetV2", async (app, _sheet, { actor }) => {
  await onRenderActorSheetV2(app, _sheet);
});
Hooks.on("renderActorSheet", async (app, _sheet, { actor }) => {
  await onRenderActorSheetV2(app, _sheet);
});
Hooks.on("createActor", async function(actor) {
  await onCreateActor(actor);
});
Hooks.on("deleteActor", async function(actor) {
  await onDeleteActor(actor);
});
Hooks.on("renderContainerSheet", async (app, html) => {
  await onRenderContainerSheet(app, html);
});
Hooks.once("closeUserConfig", async () => {
  await onCloseUserConfig();
});
Hooks.on("renderSettingsConfig", async (app, element, settings) => {
  await onRenderSettingsConfig(app, element);
});
Hooks.on("renderJournalDirectory", async (app, html, data) => {
  onRenderJournalDirectory(app);
});
//# sourceMappingURL=index.js.map
