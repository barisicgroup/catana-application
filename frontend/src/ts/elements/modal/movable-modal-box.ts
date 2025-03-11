import ModalBox from "./modal-box";
import {CallbackType} from "../element";
import { IconType } from "../icon";

class MovableModalBox extends ModalBox {

    private readonly mouseMoveListener: (MouseEvent) => void;

    public constructor(title: string, showOnStart: boolean = false, icon?: IconType) {
        super(title, showOnStart, icon);

        let x: number | null = null;
        let y: number | null = null;

        this.addClass("draggable"); // TODO make this better? Like a "setDraggable" method?
        this.header.addCallback(CallbackType.MOUSEDOWN, (type, src, event: MouseEvent) => {
            const bb = this.dom.getBoundingClientRect();
            x = event.clientX - bb.left;
            y = event.clientY - bb.top;
            this.addClass("dragging");
            document.body.classList.add("dragging");
        });
        this.header.addCallback(CallbackType.MOUSEUP, (type, src, event) => {
            x = null;
            y = null;
            this.removeClass("dragging");
            document.body.classList.remove("dragging");
        });

        this.mouseMoveListener = (event) => {
            if (x === null || y === null) return;
            this.setPosition((event.clientX - x) + "px", (event.clientY - y) + "px");
        };
        document.body.addEventListener("mousemove", this.mouseMoveListener);
    }

    public dispose() {
        document.body.removeEventListener("mousemove", this.mouseMoveListener);
        super.dispose();
        return this;
    }
}

export default MovableModalBox;