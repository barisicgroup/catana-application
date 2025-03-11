import {
    CgStructureComponent, duplicateComponentContainingStructure,
    FastaWriter,
    mergeComponentsContainingStructureIntoOne,
    PdbWriter,
    Structure, transformStructureToOxDnaGeometry,
    UnfWriter
} from "catana-backend";
import CATANA from "../../catana-instance";
import Button from "../button";
import ModalBox from "./modal-box";
import Element, { CallbackType } from "../element";
import Panel, { PanelOrientation } from "../panel";
import Checkbox from "../checkbox";
import Globals from "../../globals";
import TextElement from "../text-element";
import ImageElement from "../image-element";
import TabsMenu from "../complex/tabs-menu";
import Input from "../input";
import { ComponentsSelect } from "../specialized/component/component";
import Table, {SimpleFormTable} from "../complex/table";
import { IconType } from "../icon";

type Row = [string, Element];

class SaveFileModal extends ModalBox {
    public constructor(icon?: IconType) {
        super("Export Structure", false, icon);

        this.addClass("w-33");

        const defaultExportFileName = "catana_export";

        // PDB Export Panel
        const pdbExportPanel = new Panel(PanelOrientation.VERTICAL);
        let pdbAvailableStructuresSelect: ComponentsSelect;
        {
            const mergeToOneOnExportCheckbox = new Checkbox(true);
            pdbAvailableStructuresSelect = new ComponentsSelect(
                [
                    "structure",
                    "cg-structure"
                ],
                [
                    strucCompList => Promise.resolve(strucCompList),
                    cgCompList => Promise.resolve(cgCompList)
                ],
                true);

            const pdbExportNameInput = new Input("", "", defaultExportFileName);
            const exportSelectedStructure = new Button("Export selected structure(s)");

            exportSelectedStructure.addCallback(CallbackType.CLICK, () => {
                const selOptions = pdbAvailableStructuresSelect.getSelectedOptions();
                if (selOptions.length === 0) { return; }

                // Ensures that all atomistic structures for each included component are computed
                const buildAtoms = (compsToExport) => {
                    const promises: Promise<Structure>[] = [];

                    compsToExport.forEach(comp => {
                        if (comp.type === "cg-structure") {
                            promises.push(comp.cgStructure.buildAtomicStructure());
                        }
                    });

                    return Promise.all(promises);
                };

                // Returns the all-atom structure for the given component
                const compToStrucResolver = (comp) => {
                    if (comp.type === "structure") {
                        return comp.structure;
                    } else if (comp.type === "cg-structure") {
                        // Precondition is that the atomic structure is already generated.
                        // Right now, this is ensured by generating the atoms when they
                        // are added to the frontend.
                        return comp.cgStructure.atomicStructure;
                    }
                    console.error("Component cannot be resolved to Structure. Type: " + comp.type);
                    console.error(comp);
                    return null;
                };

                let structureCompsToExport = Globals.stage!.compList
                    .filter(x => {
                        for (let i = 0; i < selOptions.length; ++i) {
                            if (selOptions[i].value === x.uuid) {
                                return true;
                            }
                        }
                        return false;
                    });

                const exportName = pdbExportNameInput.getValue().length > 0 ? pdbExportNameInput.getValue() : defaultExportFileName;

                if (mergeToOneOnExportCheckbox.isChecked() && structureCompsToExport.length > 1) {
                    const newName = structureCompsToExport
                        .map(x => x.name)
                        .join("_");

                    buildAtoms(structureCompsToExport).then(() => {
                        const mergedComp = mergeComponentsContainingStructureIntoOne(Globals.stage!, newName, false, true,
                            compToStrucResolver, comp => { }, ...structureCompsToExport);

                        const pdbWriter = new PdbWriter(mergedComp.structure);
                        pdbWriter.download(exportName);
                        mergedComp.dispose();
                    });
                } else {
                    buildAtoms(structureCompsToExport).then(() => {
                        // TODO Individual export now ignores translation/rotation
                        for (let i = 0; i < structureCompsToExport.length; ++i) {
                            const currStructure = compToStrucResolver(structureCompsToExport[i]);
                            const pdbWriter = new PdbWriter(currStructure);
                            pdbWriter.download(exportName);
                        }
                    });
                }

            });

            const optionsTable = SaveFileModal.createTable(
                ["Select structures to export", pdbAvailableStructuresSelect],
                ["Merge to one file on export", mergeToOneOnExportCheckbox],
                ["File name", pdbExportNameInput]);

            pdbExportPanel.add(optionsTable);
            pdbExportPanel.add(exportSelectedStructure);
        }

        // UNF export panel
        const unfExportPanel = new Panel(PanelOrientation.VERTICAL);
        let unfAvailableStructuresSelect: ComponentsSelect;
        {
            const transformToOxDnaGeometry = new Checkbox(false);
            const renumberIds = new Checkbox(false);
            unfAvailableStructuresSelect = new ComponentsSelect(
                [
                    "structure",
                    "cg-structure"
                ],
                [
                    strucCompList => Promise.resolve(strucCompList),
                    cgCompList => Promise.all(cgCompList)
                ],
                true);

            const unfExportNameInput = new Input("", "", defaultExportFileName);
            const exportAsUnfButton = new Button("Export selected structure(s)");

            exportAsUnfButton.addCallback(CallbackType.CLICK, () => {
                const selOptions = unfAvailableStructuresSelect.getSelectedOptions();
                if (selOptions.length === 0) { return; }

                let structureCompsToExport = Globals.stage!.compList
                    .filter(x => {
                        for (let i = 0; i < selOptions.length; ++i) {
                            if (selOptions[i].value === x.uuid) {
                                return true;
                            }
                        }
                        return false;
                    });

                // TODO FIX This is very ineffective and not nice solution
                let compsIndicesToRemove: number[] = [];
                if (transformToOxDnaGeometry.isChecked()) {
                    for (let i = 0; i < structureCompsToExport.length; ++i) {
                        if (structureCompsToExport[i] instanceof CgStructureComponent) {
                            const duplCom = duplicateComponentContainingStructure(Globals.stage!,
                                structureCompsToExport[i] as CgStructureComponent,
                                { backendOnly: true }) as CgStructureComponent;
                            transformStructureToOxDnaGeometry(duplCom.cgStructure);
                            structureCompsToExport[i] = duplCom;
                            compsIndicesToRemove.push(i);
                        }
                    }
                }

                const exportName = unfExportNameInput.getValue().length > 0 ? unfExportNameInput.getValue() : defaultExportFileName;

                if (structureCompsToExport.length > 0) {
                    const unfWriter = new UnfWriter(structureCompsToExport as unknown as any, {
                        renumberIds: renumberIds.isChecked() || transformToOxDnaGeometry.isChecked() // We currently always renumber IDs for oxView export
                    });
                    unfWriter.download(exportName);
                    compsIndicesToRemove.forEach(idx => Globals.stage!.removeComponent(structureCompsToExport[idx]));
                }
            });

            const optionsTable = SaveFileModal.createTable(
                ["Select structures to export", unfAvailableStructuresSelect],
                ["Transform DNA/RNA strands to oxDNA geometry", transformToOxDnaGeometry],
                ["Renumber unique IDs", renumberIds],
                ["File name", unfExportNameInput]);

            unfExportPanel.add(optionsTable);
            unfExportPanel.add(exportAsUnfButton);
        }


        // FASTA export panel
        const fastaExportPanel = new Panel(PanelOrientation.VERTICAL);
        let fastaAvailableStructuresSelect: ComponentsSelect;
        {
            fastaAvailableStructuresSelect = new ComponentsSelect(
                [
                    "structure",
                    "cg-structure"
                ],
                [
                    strucCompList => Promise.resolve(strucCompList),
                    cgCompList => Promise.all(cgCompList)
                ],
                true);

            const fastaExportNameInput = new Input("", "", defaultExportFileName);
            const exportAsFastaButton = new Button("Export sequences of selected structure(s)");

            exportAsFastaButton.addCallback(CallbackType.CLICK, () => {
                const selOptions = fastaAvailableStructuresSelect.getSelectedOptions();
                if (selOptions.length === 0) { return; }

                let structureCompsToExport = Globals.stage!.compList
                    .filter(x => {
                        for (let i = 0; i < selOptions.length; ++i) {
                            if (selOptions[i].value === x.uuid) {
                                return true;
                            }
                        }
                        return false;
                    });

                const exportName = fastaExportNameInput.getValue().length > 0 ? fastaExportNameInput.getValue() : defaultExportFileName;

                if (structureCompsToExport.length > 0) {
                    const fastaWriter = new FastaWriter(structureCompsToExport as unknown as any);
                    fastaWriter.download(exportName);
                }
            });

            const optionsTable = SaveFileModal.createTable(
                ["Select structures to export", fastaAvailableStructuresSelect],
                ["File name", fastaExportNameInput]);

            fastaExportPanel.add(optionsTable);
            fastaExportPanel.add(exportAsFastaButton);
        }

        // Screenshot export panel
        const screenshotExportPanel = new Panel(PanelOrientation.VERTICAL);
        {
            const resolutionUpscaleInput = new Input("1", "number");
            const useTranspBgCheckbox = new Checkbox(false);
            const trimScreenshotCheckbox = new Checkbox(false);
            const takeScreenshotButton = new Button("Preview screenshot");
            const downloadScreenshotButton = new Button("Download screenshot").setEnabled(false);
            let lastScreenshotBlob;

            // The image src below is a blank 1x1 gif (via https://stackoverflow.com/a/14115340) to have simple valid image.src
            const screenshotPreviewImage = new ImageElement("data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs");

            const screenshotFullResolutionText = new TextElement();

            takeScreenshotButton.addCallback(CallbackType.CLICK, () => {
                Globals.animatedLoader?.show();
                Globals.stage!.makeImage({
                    factor: parseInt(resolutionUpscaleInput.getValue()),
                    antialias: true,
                    trim: trimScreenshotCheckbox.isChecked(),
                    transparent: useTranspBgCheckbox.isChecked()
                }).then(function (blob) {
                    downloadScreenshotButton.setEnabled(true);
                    lastScreenshotBlob = blob;
                    var objectURL = URL.createObjectURL(lastScreenshotBlob);
                    screenshotPreviewImage.dom.src = objectURL;

                    setTimeout(() => {
                        Globals.animatedLoader?.hide();
                        screenshotFullResolutionText.setText("(full resolution " +
                            screenshotPreviewImage.dom.naturalWidth + " x " +
                            screenshotPreviewImage.dom.naturalHeight + ")");
                    }, 200);
                })
            });

            downloadScreenshotButton.addCallback(CallbackType.CLICK, () => {
                const date = new Date();

                CATANA.download(lastScreenshotBlob, "catana_screenshot_" +
                    date.getDay() + "_" + date.getHours() + "_" +
                    date.getMinutes() + "_" + date.getSeconds());
            })

            const screenshotPreviewPanel = new Panel(PanelOrientation.VERTICAL);
            screenshotPreviewPanel.add(new TextElement("Screenshot preview: "));
            screenshotPreviewPanel.add(screenshotFullResolutionText);
            screenshotPreviewPanel.add(screenshotPreviewImage);

            const optionsTable = SaveFileModal.createTable(
                ["Screenshot resolution upscale", resolutionUpscaleInput],
                ["Transparent background", useTranspBgCheckbox],
                ["Trim empty space", trimScreenshotCheckbox]);

            screenshotExportPanel.add(optionsTable);
            screenshotExportPanel.add(takeScreenshotButton);
            screenshotExportPanel.add(downloadScreenshotButton);
            screenshotExportPanel.add(screenshotPreviewPanel);
        }

        this.add(new TabsMenu()
            .addTab("PDB", pdbExportPanel)
            .addTab("UNF", unfExportPanel)
            .addTab("FASTA", fastaExportPanel)
            .addTab("Screenshot", screenshotExportPanel));

        document.body.appendChild(this.dom);
    }

    private static createTable(...rows: Row[]): Table<[TextElement, Element]> {
        const table = new SimpleFormTable();
        for (const row of rows) {
            table.addRow([new TextElement(row[0]), row[1]]);
        }
        return table;
    }
}

export default SaveFileModal;