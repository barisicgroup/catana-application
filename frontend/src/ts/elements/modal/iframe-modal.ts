import TextElement from "../text-element";
import { IconType } from "../icon";
import MovableModalBox from "./movable-modal-box";
import Iframe from "../iframe";

class IframeModal extends MovableModalBox {
    public constructor(webTitle: string, url: string) {
        super(webTitle, false, IconType.GLOBE);

        const urlLink = new TextElement("Full page link: ")
            .h(url, url, true);

        const iframe = new Iframe(url, webTitle);

        this.addClass("h-50");
        this.addClass("w-50");
        
        this.content.dom.style.width = "100%";
        this.content.dom.style.height = "100%";

        iframe.dom.style.width = "100%";
        iframe.dom.style.height = "100%";
        
        this.add(urlLink, iframe);
    }
}

export default IframeModal;