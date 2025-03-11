import MovableModalBox from "./movable-modal-box";
import { IconType } from "../icon";
import TextArea from "../text-area";
import Input from "../input";
import Button from "../button";
import { CallbackType } from "../element";
import Globals from "../../globals";
import { Log } from "catana-backend";

class BugModal extends MovableModalBox {

    private readonly bugReportTextArea: TextArea;

    public constructor() {
        super("Bug Report", false, IconType.BUG);
        this.bugReportTextArea = new TextArea().setResizable("both");
        const emailInput = new Input("", undefined, "(Optional) Email for future contact");
        const button = new Button("Send to developers").addCallback(CallbackType.CLICK, () => {
            const bugReport = this.bugReportTextArea.getValue();
            const email = emailInput.getValue();
            const text = `User bug report (email: ${email}): ${bugReport}`;

            Globals.rollbar?.error(text, function (err, data) {
                if (err) {
                    Log.error("There was an error when submitting the bug: ", err);
                } else {
                    Log.info("Bug report submitted. Thank you!");
                }
            });
        });

        if (!Globals.rollbar) {
            button.setEnabled(false);
            button.setText("Bug reporting service not available");

            emailInput.setEnabled(false);
            this.bugReportTextArea.setEnabled(false);
        }

        this.add(this.bugReportTextArea, emailInput, button);
    }

    public setBugReport(bugReport: string) {
        this.bugReportTextArea.setText(bugReport);
    }
}

export default BugModal;