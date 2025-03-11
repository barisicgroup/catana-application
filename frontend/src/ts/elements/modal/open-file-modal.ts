import ModalBox from "./modal-box";
import CATANA from "../../catana-instance";
import Button from "../button";
import { CallbackType } from "../element";
import Globals from "../../globals";
import TextElement from "../text-element";
import Input from "../input";
import FormDialog from "../complex/form-dialog";
import Select from "../select";
import TitledPanel from "../complex/titled-panel";
import Panel, { PanelOrientation } from "../panel";
import FileDropArea from "../file-drop-area";
import { IconType } from "../icon";

const AVAILABLE_EXTENSIONS = CATANA.flatten([
    CATANA.ParserRegistry.getSceneDataExtensions(),
    CATANA.ParserRegistry.getStructureExtensions(),
    CATANA.ParserRegistry.getVolumeExtensions(),
    CATANA.ParserRegistry.getSurfaceExtensions(),
    CATANA.DecompressorRegistry.names
], []);

class OpenFileModal extends ModalBox {

    private readonly dbSelect: Select;

    private readonly remoteText: TextElement;
    private readonly remoteInput: Input;

    public constructor(icon?: IconType) {
        super("Import Structure", false, icon);

        this.dbSelect = this.createDbSelect();
        const fileDropArea = this.createDropArea();

        // DB input
        this.remoteText = new TextElement("PDB ID:");
        this.remoteInput = new Input().setPlaceholder("3UGM, 1BNA")
            .addCallback(CallbackType.KEYDOWN, (type, src, e: KeyboardEvent) => {
                if (e.code === "Enter") {
                    this.remoteFetch(this.dbSelect.getValue())
                }
            });
        const button = new Button("Download and import")
            .addCallback(CallbackType.CLICK, () => this.remoteFetch(this.dbSelect.getValue()));
        const dbPanel = new Panel(PanelOrientation.HORIZONTAL).add(this.remoteText, this.remoteInput, button);

        // Remote
        const remotePanel = new TitledPanel("From the internet (remote)", PanelOrientation.VERTICAL);
        remotePanel.add(this.dbSelect, dbPanel);

        // Local
        const localPanel = new TitledPanel("From your device (local)");
        localPanel.add(fileDropArea);

        // Add to this modal box
        this.add(remotePanel, localPanel);
    }

    private createDbSelect(): Select {
        const dbSelect = new Select({
            "rcsb": "RCSB database (PDB ID)",
            "pubchem": "PubChem (CID)",
            "afolddb": "AlphaFold Protein Structure Database (Uniprot ID)",
            "alphafill": "AlphaFill databank (Structure ID)",
            "url": "Custom URL"
        }, false)
            .setSelectedIndex(0)
            .addCallback(CallbackType.CHANGE, () => {
                const selval = dbSelect.getValue();

                // TODO This can/should be probably deduplicated

                if (selval === "rcsb") {
                    this.remoteText.setText("PDB ID:");
                    this.remoteInput.setPlaceholder("3UGM, 1BNA");
                } else if (selval === "afolddb") {
                    this.remoteText.setText("Uniprot ID:");
                    this.remoteInput.setPlaceholder("Q5VSL9, B2SU53");
                } else if (selval === "pubchem") {
                    this.remoteText.setText("PubChem CID:");
                    this.remoteInput.setPlaceholder("6106, 2244");
                } else if (selval === "alphafill") {
                    this.remoteText.setText("AlphaFill ID:");
                    this.remoteInput.setPlaceholder("Q0G9W6, A4QKS7");
                } else if (selval === "url") {
                    this.remoteText.setText("URL:");
                    this.remoteInput.setPlaceholder("https://www.xxx.yyy/abc.pdb");
                } else {
                    console.error("Unknown database!");
                }
            });
        return dbSelect;
    }

    private createDropArea(): FileDropArea {
        const fda = new FileDropArea("Choose files or drag them here", AVAILABLE_EXTENSIONS)
            .addCallback(CallbackType.CHANGE, () => {
                const files = fda.getFiles();
                if (files) {
                    new CATANA.Queue(this.processUploadedFile, Array.from(files));
                    this.hide();
                }
            });
        return fda;
    }

    private remoteFetch(inputType: string) {
        if (this.remoteInput.getValue().length === 0) {
            CATANA.Log.warn("No PDB codes inputted!");
            return;
        }

        let values = inputType !== "url"
            ? this.remoteInput.getValue().trim().split(",")
            : [this.remoteInput.getValue().trim()];

        for (let i = 0; i < values.length; ++i) {
            let value = values[i].trim().toLowerCase();
            let protocol = "";

            if (inputType === "rcsb") {
                protocol = "rcsb://";
                const isPdb = value.includes(".pdb");
                const isCif = value.includes(".cif");

                if (!isPdb && !isCif) {
                    value += ".cif";
                }
            } else if (inputType === "afolddb") {
                protocol = "afoldebidb://";
            } else if (inputType === "pubchem") {
                protocol = "pubchem://"
            } else if (inputType === "alphafill") {
                protocol = "alphafill://"
            } else if (inputType === "url") {
                if (!value.includes("http")) {
                    protocol = "https://";
                }
            } else {
                console.error("Unknown input DB");
            }

            if (i === 0) {
                Globals.animatedLoader?.show();
            }

            const emptyFunc = undefined;
            const hideFunc = (comps) => {
                Globals.animatedLoader?.hide();
                if (comps.length > 0) {
                    comps[comps.length - 1].autoView();
                }
            };

            Globals.stage!.loadFile(protocol + value, {
                defaultRepresentation: true
            }).then(
                i < values.length - 1 ? emptyFunc : hideFunc,
                () => {
                    if(value.includes(".cif"))
                    {
                        value = value.replace(".cif", ".pdb");
                        Globals.stage!.loadFile(protocol + value, {
                            defaultRepresentation: true
                        }).then(
                            i < values.length - 1 ? emptyFunc : hideFunc,
                            () => {
                                CATANA.Log.error("File not found: " + value);
                                hideFunc([]);
                            });
                    }
                    else
                    {
                        CATANA.Log.error("File not found: " + value);
                        hideFunc([]);
                    }
                });
        }

        this.hide();
    }

    private processUploadedFile(file: File, callback: () => void) {
        const ext = (file.name.split('.').pop() || "").toLowerCase();
        if (AVAILABLE_EXTENSIONS.includes(ext)) {
            const _load = function (parameters = {}) {
                const p = Object.assign({ defaultRepresentation: true }, parameters);
                Globals.animatedLoader?.show();
                Globals.stage!.loadFile(file, p).then(comps => {
                    Globals.animatedLoader?.hide();
                    if (comps.length > 0) {
                        comps[0].autoView();
                    }
                    callback();
                });
            }

            const requiredParameters = CATANA.getParserParameters(ext);
            if (Object.keys(requiredParameters).length > 0) {
                const title = "Import " + ext + ": " + file.name;
                const confirmText = "Convert to UNF remotely and import";
                const dialog = new FormDialog(title, confirmText, requiredParameters);
                document.body.appendChild(dialog.dom);
                dialog.show().wait().then(confirmed => {
                    if (confirmed) {
                        _load(dialog.getParameters());
                    }
                    dialog.dispose();
                });
            } else {
                _load();
            }

        } else {
            CATANA.Log.error("Unknown file extension: " + ext);
            callback();
        }
    }

    public hide() {
        super.hide();
        this.remoteInput?.setValue("");

        return this;
    }
}

export default OpenFileModal;