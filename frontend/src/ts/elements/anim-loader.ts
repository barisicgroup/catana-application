import Element from "./element";

/**
 * Creates CSS-animated loader element used for loading animations
 */
class AnimLoader extends Element<HTMLDivElement> {
    public constructor() {
        super(document.createElement("div"));
        this.dom.className = "AnimLoader";
    }

    public show() {
        this.setVisible(true);
    }

    public hide() {
        this.setVisible(false);
    }
}

export default AnimLoader;