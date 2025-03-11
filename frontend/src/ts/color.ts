import {forEachEnumValue} from "./util";

export enum ColorEnum {
    CATANA_BLUE,
    HIGHLIGHT,
    BAD,
    GOOD,
    BACKGROUND_DARK,
    BACKGROUND_MIDDLE,
    BACKGROUND_LIGHT,
    FOREGROUND_DARK,
    FOREGROUND_LIGHT,
    BORDER,
    SHADOW
}

const enum2prop: { [type in ColorEnum]: string } = {
    [ColorEnum.CATANA_BLUE]: "--color-catana-blue",
    [ColorEnum.HIGHLIGHT]: "--color-highlight",
    [ColorEnum.BAD]: "--color-bad",
    [ColorEnum.GOOD]: "--color-good",
    [ColorEnum.BACKGROUND_DARK]: "--color-background-dark",
    [ColorEnum.BACKGROUND_MIDDLE]: "--color-background-middle",
    [ColorEnum.BACKGROUND_LIGHT]: "--color-background-light",
    [ColorEnum.FOREGROUND_DARK]: "--color-foreground-dark",
    [ColorEnum.FOREGROUND_LIGHT]: "--color-foreground-light",
    [ColorEnum.BORDER]: "--color-border",
    [ColorEnum.SHADOW]: "--color-shadow"
}

const enum2color: { [type in ColorEnum]: string } = {
    [ColorEnum.CATANA_BLUE]: "#2CABE2",
    [ColorEnum.HIGHLIGHT]: "yellow",
    [ColorEnum.BAD]: "red",
    [ColorEnum.GOOD]: "green",
    [ColorEnum.BACKGROUND_DARK]: "#303b40",
    [ColorEnum.BACKGROUND_MIDDLE]: "#4d5e66",
    [ColorEnum.BACKGROUND_LIGHT]: "white",
    [ColorEnum.FOREGROUND_DARK]: "var(" + enum2prop[ColorEnum.BACKGROUND_DARK] + ")",
    [ColorEnum.FOREGROUND_LIGHT]: "var(" + enum2prop[ColorEnum.BACKGROUND_LIGHT] + ")",
    [ColorEnum.BORDER]: "var(" + enum2prop[ColorEnum.BACKGROUND_MIDDLE] + ")",
    [ColorEnum.SHADOW]: "black"
}

export default function getColor(c: ColorEnum) {
    return enum2color[c];
}

export function setStylesheetColors() {
    forEachEnumValue(ColorEnum, (e) => {
        document.documentElement.style.setProperty(enum2prop[e], enum2color[e]);
    });
}