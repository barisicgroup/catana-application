import { appendAnyStructureComps, Component } from "catana-backend";

import ModalBox from "./modal-box";
import { CallbackType } from "../element";
import Button from "../button";
import { ComponentsSelect } from "../specialized/component/component";
import { IconType } from "../icon";
import TextElement from "../text-element";

class MergeModal extends ModalBox {
    public constructor(component: Component, icon?: IconType) {
        super("Merge with other structure", false, icon);

        const availableStructuresSelect = new ComponentsSelect(
            [
                "structure",
                "cg-structure"
            ],
            [
                strucCompList => Promise.resolve(strucCompList),
                cgCompList => Promise.all(cgCompList)
            ],
            false,
            [
                component
            ]);

        const mergeButton = new Button("Merge");

        this.add(new TextElement("Merge the data of the other structure into this structure.")
            .br()
            .t("The other structure will remain intact but it will be made invisible."));
        this.add(availableStructuresSelect);
        this.add(mergeButton);

        mergeButton.addCallback(CallbackType.CLICK, () => {
            const structureCompsToExport = availableStructuresSelect.getComponents();

            if (structureCompsToExport.length > 0) {
                appendAnyStructureComps(component as any, structureCompsToExport[0] as any);                
            }
        });
    }
}

export default MergeModal;