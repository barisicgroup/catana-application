import Globals from "../../globals";
import { SimpleFormTable } from "../complex/table";
import Icon, { IconType } from "../icon";
import TextElement from "../text-element";
import ModalBox from "./modal-box";

const alphaFoldCheckUrl = "THIS_WAS_REMOVED";  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
const convertersCheckUrl = "THIS_WAS_REMOVED";  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE

class ServicesStatusModal extends ModalBox {
    private internetConnectionIcon: Icon;
    private alphaFoldIcon: Icon;
    private convertersIcon: Icon;
    private rollbarIcon: Icon;

    public constructor(icon?: IconType) {
        super("Status of Services", false, icon);

        this.internetConnectionIcon = new Icon();
        this.alphaFoldIcon = new Icon();
        this.convertersIcon = new Icon();
        this.rollbarIcon = new Icon();

        this.add(new SimpleFormTable()
            .addRow([new TextElement("Internet connection: "), this.internetConnectionIcon])
            .addRow([new TextElement("AlphaFold service:"), this.alphaFoldIcon])
            .addRow([new TextElement("Converter service:"), this.convertersIcon])
            .addRow([new TextElement("Bug reporting service:"), this.rollbarIcon])
        );

        this.addOnShowCallback(() => {
            this.internetConnectionIcon.setIcon(
                window.navigator.onLine ? IconType.CHECK_MARK : IconType.X_MARK);
            this.alphaFoldIcon.setIcon(IconType.QUESTION_MARK);
            this.convertersIcon.setIcon(IconType.QUESTION_MARK);
            this.rollbarIcon.setIcon(Globals.rollbar ? IconType.CHECK_MARK : IconType.X_MARK)

            fetch(alphaFoldCheckUrl)
                .then(response => {
                    this.alphaFoldIcon.setIcon(response.ok ? IconType.CHECK_MARK : IconType.X_MARK);
                })
                .catch(error => {
                    this.alphaFoldIcon.setIcon(IconType.X_MARK);
                });

            fetch(convertersCheckUrl)
                .then(response => {
                    this.convertersIcon.setIcon(response.ok ? IconType.CHECK_MARK : IconType.X_MARK);
                })
                .catch(error => {
                    this.convertersIcon.setIcon(IconType.X_MARK);
                });
        });
    }
}

export default ServicesStatusModal;