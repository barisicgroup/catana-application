import MovableModalBox from "./movable-modal-box";
import { IconType } from "../icon";
import { Component, StructureAnalysis } from "catana-backend";
import { ComponentsSelect } from "../specialized/component/component";
import Button from "../button";
import { CallbackType } from "../element";
import Panel from "../panel";

class StructureAnalysisModal extends MovableModalBox {
    private _strucAnalysis: StructureAnalysis | null = null;
    private _analysisContent: Panel;

    public constructor(icon?: IconType) {
        super("Structure Analysis", false, icon);

        const structuresSelect = new ComponentsSelect(
            [
                "structure",
                "cg-structure"
            ],
            [
                strucCompList => Promise.resolve(strucCompList),
                cgCompList => Promise.resolve(cgCompList)
            ],
            false);

        const showAnalysisButton = new Button("Show (Reload) analysis");

        this._analysisContent = new Panel();

        showAnalysisButton.addCallback(CallbackType.CLICK, () => {
            const comps = structuresSelect.getComponents();

            if (comps.length > 0) {
                this.showComponentAnalysis(comps[0]);
            }
        });

        this.add(structuresSelect);
        this.add(showAnalysisButton);
        this.add(this._analysisContent);
    }

    private showComponentAnalysis(comp: Component): void {
        if (this._strucAnalysis) {
            this._strucAnalysis.dispose();
        }

        this._strucAnalysis = new StructureAnalysis(this._analysisContent.dom, comp as any);
    }
}

export default StructureAnalysisModal;