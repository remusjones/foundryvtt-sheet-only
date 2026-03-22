import {registerSettings} from "./settings";
import {patchApplicationV2} from "./touchGuard";

export function onInit() {
    registerSettings();
    patchApplicationV2();
}