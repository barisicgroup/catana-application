import CATANA from "../../catana-instance";
import ModalBox from "./modal-box";
import ImageElement from "../image-element";
import TextElement from "../text-element";
import Panel, { PanelOrientation } from "../panel";
import { IconType } from "../icon";

class AboutModal extends ModalBox {
    public constructor(icon?: IconType) {
        super("About Catana software, v" + CATANA.Version, false, icon);
        
        const catanaPanel = new Panel(PanelOrientation.HORIZONTAL);

        const catanaImage = new ImageElement("./favicon.ico", 96);
        const catanaText = new TextElement()
            .t("Catana (")
            .h("https://catana.ait.ac.at/", "Official website")
            .t(") is an online modeling environment for the creation of recombinant proteins and the " +
                "functionalization of nucleic acid nanostructures. It was developed as a part of the ")
            .h("https://www.mariliaproject.eu/", "MARILIA project")
            .t(". If you use Catana in your research, we would appreciate it if you can ")
            .h("https://doi.org/10.1093/nar/gkac350", "cite our paper")
            .t(".");

        const euPanel = new Panel(PanelOrientation.HORIZONTAL);

        const euLogoImage = new ImageElement("./img/logo_eu.png", 96);
        const euText = new TextElement("This project has received funding from the European Union's Horizon " +
            "2020 research and innovation program under grant agreement No. 952110 (MARILIA).");
        
        catanaPanel.add(catanaImage, catanaText);
        euPanel.add(euLogoImage, euText);

        this.add(catanaPanel, euPanel);
    }
}

export default AboutModal;