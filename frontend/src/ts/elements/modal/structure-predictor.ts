import LocalStorage from "../../local-storage";
import ModalBox from "./modal-box";
import Element, {CallbackType} from "../element";
import Panel, {PanelOrientation} from "../panel";
import Table, {TableType} from "../complex/table";
import TextElement from "../text-element";
import {getCurrentTimeFormatted, openLink} from "../../util";
import Button from "../button";
import Alert from "../complex/alert";
import Globals from "../../globals";
import Input from "../input";
import {SimpleSequenceEditor} from "../specialized/sequence-editor";
import CATANA from "../../catana-instance";
import TitledPanel from "../complex/titled-panel";
import {IconButton, IconType} from "../icon";
import {EMAIL_REGEX} from "../../constants";
import TabsMenu from "../complex/tabs-menu";

enum StatusType {
    ERROR, NOT_FOUND, PENDING, SUCCESS
}

interface Status {
    type: StatusType;
    score?: string;
}

interface Prediction {
    name: string;
    sequence: string;
    status: Status;
    log: string[];
}

interface Fasta {
    name: string;
    sequence: string;
}

type Row = [TextElement, TextElement, TextElement, TextElement, Element]

export class StructurePredictorModalBox extends ModalBox {

    private static readonly LOCAL_STORAGE =
        new LocalStorage<{ [id: string]: Prediction }>("StorageKey_StructurePredictorModalBox_AlphaFold_IDs");

    public static readonly URL = "THIS_WAS_REMOVED";  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE

    private readonly ids: { [id: string]: Prediction };

    private readonly idsListLabel: TextElement;
    private readonly idsTable: Table<Row>;

    private static fetch(command: string): Promise<Response> {
        return fetch("THIS_WAS_REMOVED")  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
            .then((response) => {
                if (!response.ok) throw "Server response was not ok";
                if (response.body === null) throw "Server response had null body";
                return response;
            });
    }

    private static fetchText(command: string): Promise<string> {
        return this.fetch(command).then(response => response.text());
    }

    private static fetchJson(command: string): Promise<any> {
        return this.fetch(command).then(response => response.json());
    }

    private static fetchFasta(id: string): Promise<null | Fasta> {
        return this.fetchText("THIS_WAS_REMOVED")  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
            .then(responseText => {
                if (responseText.startsWith("Failed to get FASTA")) return null;
                let sequence = "";
                const lines = responseText.split("\n");
                const name = lines[0].substring(1);
                for (let i = 1; i < lines.length; ++i) {
                    sequence += lines[i];
                }
                return {name: name, sequence: sequence};
            });
    }

    private static fetchStatus(id: string): Promise<Status> {
        return StructurePredictorModalBox.fetchText("THIS_WAS_REMOVED")  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
            .then(responseText => {
                responseText = responseText.toLowerCase();
                if (responseText.includes("not found")) {
                    return {type: StatusType.NOT_FOUND};
                }
                if (responseText.includes("pending")) {
                    return {type: StatusType.PENDING};
                }
                if (responseText.includes("success")) {
                    return {type: StatusType.SUCCESS, score: responseText.split(" ").pop()}
                }
                throw "Unable to decode task status from server. Status: " + responseText;
            }).catch((onRejected) => {
                console.error(onRejected);
                return {type: StatusType.ERROR};
            });
    }

    private static getStatusLogText(status: Status): string {
        switch (status.type) {
            case StatusType.SUCCESS:
                return "Task finished.";
            case StatusType.PENDING:
                return "Task still pending at: " + getCurrentTimeFormatted();
            case StatusType.NOT_FOUND:
                return "Task not found at: " + getCurrentTimeFormatted();
            default:
                console.error("Unknown status with type '" + status.type + "'");
                // Fallthrough
            case StatusType.ERROR:
                return "Failed to check task at: " + getCurrentTimeFormatted();
        }
    }

    private getLastStatus(id: string): StatusType {//logPanel: Panel): StatusType {
        //const text = logPanel.dom.lastChild?.textContent || "";
        const log = this.ids[id].log;
        const text = log[log.length - 1];
        if (text.startsWith("Task still pending at: ")) return StatusType.PENDING;
        if (text.startsWith("Task finished.")) return StatusType.SUCCESS;
        if (text.startsWith("Task not fount at: ")) return StatusType.NOT_FOUND;
        return StatusType.ERROR
    }

    private static getQueueLength(): Promise<string> {
        return StructurePredictorModalBox.fetchJson("queue_length")
            .then(responseJson => {
                if (!('queued' in responseJson)) throw "Invalid JSON returned from the server!";
                return responseJson.queued;
            })
    }

    private addId(id: string, status: Status, name: string = "", sequence: string = "", log: string[] = [], fetch: boolean = true) {
        if (fetch && (name === "" || sequence === "")) {
            StructurePredictorModalBox.fetchFasta(id)
                .then(fasta => {
                    if (!fasta) {
                        // TODO do something better
                        console.error("Failed to get prediction FASTA from the server");
                        return
                    }
                    this.addId(id, status, fasta.name, fasta.sequence, log, false);
                })
                .catch(onRejected => {
                    this.addId(id, status, "", "", log, false);
                });
            return;
        }
        this.ids[id] = { name: name, sequence: sequence, status: status, log: log };
        StructurePredictorModalBox.LOCAL_STORAGE.set(this.ids);
        this.addRow(id, status, name, sequence, log);
    }

    private addIdStatus(id: string, status: Status, logPanel: Panel) {
        if (status.type === StatusType.SUCCESS && this.getLastStatus(id) === StatusType.SUCCESS) {
            // Do nothing
        } else {
            const statusText = StructurePredictorModalBox.getStatusLogText(status);
            logPanel.add(new TextElement(statusText));
            this.ids[id].log.push(statusText);
            this.ids[id].status = status;
            StructurePredictorModalBox.LOCAL_STORAGE.set(this.ids);
        }
    }

    //private setName(id: string, name: string) {
        //this.ids[id].name = name;
        //StructurePredictorModalBox.LOCAL_STORAGE.set(this.ids);
    //}

    private addRow(_id: string, _status: Status, _name: string = "", _sequence: string = "", _log: string[] = []) {
        const statusPanel = new Panel(PanelOrientation.VERTICAL).addClass("AlphaFoldTaskStatusPanel");
        for (const l of _log) {
            statusPanel.add(new TextElement(l));
        }
        const _score = _status.score || "";

        //const name = new Input(_name).setTitle(_name)
            //.addCallback(CallbackType.INPUT, () => this.setName(_id, name.getValue()));
        const name = new TextElement(_name).setTitle(_name).makeCopiable();
        const sequence = new TextElement(_sequence).setTitle(_sequence).makeCopiable();
        const id = new TextElement(_id).setTitle(_id).makeCopiable();
        const score = new TextElement(_score).setTitle(_score).makeCopiable();

        let check: IconButton;
        let preview: IconButton = this.getPreviewButton(_id);
        preview.setVisible(false);

        switch (_status.type) {
            case StatusType.ERROR:
            default:
                this.addIdStatus(_id, _status, statusPanel);
            // Fallthrough
            case StatusType.PENDING:
            case StatusType.SUCCESS:
                preview.setVisible(_status.type === StatusType.SUCCESS);
                check = new IconButton(_status.type === StatusType.SUCCESS ? IconType.DOWNLOAD : IconType.REFRESH)
                    .setTitle(_status.type === StatusType.SUCCESS ? "Download PDB" : "")
                    .addCallback(CallbackType.CLICK, () => {
                        if (this.ids[_id].status.type === StatusType.SUCCESS) {
                            openLink("THIS_WAS_REMOVED", false);  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                            return;
                        }
                        StructurePredictorModalBox.fetchStatus(_id).then(status => {
                            if (status.type === StatusType.SUCCESS) {
                                Globals.tooltip?.deactivate();
                                this.addIdStatus(_id, status, statusPanel);
                                check.setIcon(IconType.DOWNLOAD);
                                check.setTitle("Download PDB");
                                preview.setVisible(true);
                                score.setText(status.score || "");
                            } else {
                                this.addIdStatus(_id, status, statusPanel);
                            }
                        }, reason => {
                            console.error(reason);
                            const status = new TextElement("Check status");
                            const result = new TextElement("Download result (if available)");
                            const alert = new Alert("AlphaFold prediction status");
                            alert.add(status, result);
                            status.link("THIS_WAS_REMOVED");  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                            result.link("THIS_WAS_REMOVED");  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                            document.body.appendChild(alert.dom);
                            alert.show();
                        })
                    });
                break;
        }
        check.addCallback([CallbackType.MOUSEMOVE, CallbackType.MOUSELEAVE], (type, src, e) => {
            if (this.ids[_id].status.type === StatusType.SUCCESS) return;
            if (this.ids[_id].log.length === 0) return;
            switch (type) {
                case CallbackType.MOUSEMOVE:
                    const bb = check.dom.getBoundingClientRect();
                    Globals.tooltip?.activate(statusPanel, bb.left, bb.bottom);
                    break;
                case CallbackType.MOUSELEAVE:
                    Globals.tooltip?.deactivate();
                    break;
            }
        });

        const resultButtons = new Panel(PanelOrientation.HORIZONTAL).add(preview, check);

        this.idsListLabel.setVisible(true);
        this.idsTable.setVisible(true);

        this.idsTable.addRow([name, sequence, id, score, resultButtons], _id);
    }

    private getPreviewButton(id: string): IconButton {
        return new IconButton(IconType.EYE)
            .setTitle("Visualize the result")
            .addCallback(CallbackType.CLICK, () => {
                const pdbUrl = "THIS_WAS_REMOVED";  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                Globals.stage?.loadFile(pdbUrl, {
                    defaultRepresentation: true,
                    ext: "pdb"
                });
            });
    }

    private feedback(feedback: TextElement, feedbackText: string, id?: string, name?: string, sequence?: string) {
        feedback.setText("❗ " + feedbackText);
        if (id && name && sequence) {
            const time = getCurrentTimeFormatted();
            this.addId(id, {type: StatusType.PENDING}, name, sequence, ["Submitted at: " + time]);
        }
    }

    public constructor(icon?: IconType) {
        super("Structure predictor", false, icon);

        // TODO move the AlphaFold predictor to its own class
        const predictor_alphaFold = new Panel(PanelOrientation.VERTICAL).addClass("Predictor").setId("AlphaFold");
        {
            // List consists of:
            // Name, Sequence, Time, Id, Buttons, (Move Up and Down), (Delete)
            const stretches = [1, 1, 1, 1, 0];
            const header = ["Name", "Sequence", "ID", "Score", ""];
            this.idsTable = new Table<Row>(5, TableType.LIST, true, false, stretches, header);
            this.idsTable.addOnRowDeletedCallback(id => {
                delete this.ids[id];
                StructurePredictorModalBox.LOCAL_STORAGE.set(this.ids);
                if (Object.keys(this.ids).length > 0) {
                    this.idsListLabel.setVisible(false);
                    this.idsTable.setVisible(false);
                }
            });

            const queueLength = new TextElement();

            const updateQueueLengthInfo = () => {
                StructurePredictorModalBox.getQueueLength()
                    .then((length: string) => {
                        queueLength.setText("Tasks in queue: " + length);
                    })
                    .catch(reason => {
                        console.error(reason);
                        // "Publicly" ignore the information about the length of the queue if we fail to retrieve it
                    });
            };

            updateQueueLengthInfo();

            const name = new Input("", undefined, "Name");
            //const sequence = new UI.Input("", undefined, "Sequence");
            const sequence = new SimpleSequenceEditor(true, false);
            const email = new Input("", undefined, "Optional: Email for notification after the prediction is finished");
            const button = new Button("Predict remotely").addCallback(CallbackType.CLICK, () => {
                const n = name.getValue().trim();
                let s = sequence.getValue().replace(/[ ,]/g, "").toUpperCase();
                let e = email.getValue().trim();

                if (n.length === 0) {
                    this.feedback(feedback, "Please input prediction name.");
                    return;
                }

                if (e.length > 0 && !e.match(EMAIL_REGEX)) {
                    this.feedback(feedback, "The input email address does not seem to be valid: " + e);
                    return;
                }

                const lenMin = 16;
                const lenMax = 1500;
                if (s.length < lenMin || s.length > lenMax) {
                    this.feedback(feedback, "Sequence length (" + s.length + ") is out of bounds. Only sequences between " +
                        lenMin + " and " + lenMax + " amino acids are supported now.");
                    return;
                }
                const sequenceType = CATANA.getAminoAcidSequenceType(s);
                if (CATANA.getAminoAcidSequenceType(s) === "invalid") {
                    this.feedback(feedback, "Sequence is invalid. Please verify it and try submitting again");
                    return;
                } else if (sequenceType === "three-letter") {
                    s = CATANA.threeLetterToOneLetter(s)!;
                }

                const data = new URLSearchParams();
                data.append("name", n);
                data.append("sequence", s);
                data.append("email", e);
                fetch("THIS_WAS_REMOVED", {  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
                    method: "POST",
                    body: data,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then((response => {
                    if (response.ok && response.status === 200) {
                        return response.text();
                    } else {
                        const text = "Failed to send sequence to the server.";
                        this.feedback(feedback, text);
                        console.error(text);
                        // TODO find out why
                        return null;
                    }
                }), reason => {
                    const text = "Failed to send sequence to the server.";
                    this.feedback(feedback, text);
                    console.error(text);
                }).then((taskId) => {
                    if (typeof taskId === "string")
                        this.feedback(feedback, "Sequence successfully sent to server!", taskId, n, s);
                    updateQueueLengthInfo();
                }, reason => {
                    const text = "Failed to read the server's response."
                    this.feedback(feedback, text);
                    console.error(text);
                });
            });
            const feedback = new TextElement();
            this.idsListLabel = new TextElement("Saved predictions:");
            const predictionsTimeNote = new TextElement("Note: Each prediction task usually takes several hours to complete.");

            const addIdInput = new Input("", undefined, "Existing prediction ID");
            const addIdButton = new Button("Add prediction ID to list").addCallback(CallbackType.CLICK, () => {
                const id = addIdInput.getValue().toLowerCase();
                StructurePredictorModalBox.fetchStatus(id).then(status => {
                    this.addId(id, status);
                });
            });

            const panel_startTask = new TitledPanel("Start new prediction", PanelOrientation.VERTICAL)
                .add(name, sequence, email, button, queueLength, predictionsTimeNote, feedback);
            const panel_viewTasks = new TitledPanel("View submitted predictions", PanelOrientation.VERTICAL)
                .add(addIdInput, addIdButton, this.idsListLabel, this.idsTable);

            predictor_alphaFold.add(panel_startTask, panel_viewTasks);
        }

        this.idsListLabel.setVisible(false);
        this.idsTable.setVisible(false);

        this.ids = StructurePredictorModalBox.LOCAL_STORAGE.get({});
        for (const id in this.ids) {
            const o = (this.ids[id] || {}) as Partial<Prediction>;
            o.name = o.name || "";
            o.sequence = o.sequence || "";
            o.log = o.log || [];
            StructurePredictorModalBox.fetchStatus(id)
                .then(status => {
                    o.log?.push(StructurePredictorModalBox.getStatusLogText(status));
                    o.status = status;
                    this.addId(id, status, o.name, o.sequence, o.log);
                });
        }

        this.add(new TabsMenu()
            .addTab("AlphaFold", predictor_alphaFold));
    }
}