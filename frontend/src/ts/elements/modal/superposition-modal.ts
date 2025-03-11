import {CgStructureComponent, Component, Quaternion, Structure, StructureComponent} from "catana-backend";

import CATANA from "../../catana-instance";
import {CallbackType} from "../element";
import Button from "../button";
import {ComponentsSelect} from "../specialized/component/component";
import {IconType} from "../icon";
import Select from "../select";
import TextElement from "../text-element";
import Table, {SimpleFormTable} from "../complex/table";
import Element from "../element";
import MovableModalBox from "./movable-modal-box";

const ALIGNMENT_MODES = ["Structural superposing", "Principal axes", "Component placement"] as const;
type Mode = typeof ALIGNMENT_MODES[number];
const ALIGNMENT_FUNCTIONS: { [mode in Mode]: (src: Component, srcStruct: Structure, dst: Component, dstStruct: Structure) => void } = {
    "Structural superposing": (src: Component, srcStruct: Structure, dst: Component, dstStruct: Structure) => {
        // TODO This is not very nice solution but gets the superposition
        //      working consistently (from visuals/export perspective)
        src.setPosition([0, 0, 0]);
        src.setRotation([0, 0, 0]);

        dst.setPosition([0, 0, 0]);
        dst.setRotation([0, 0, 0]);

        CATANA.superpose(srcStruct, dstStruct, true);

        // Trying to make superposition work when the components are translated/rotated
        // but it was not working very well .. :/
        // ---
        // Note: using component.setTransform is not very desired atm
        // as it may not work well with other functions working purely with
        // position/rotation, etc.
        // ==
        /*const translation = new CATANA.Vector3();
        translation.setFromMatrixPosition(spMatrix);
        console.log(spMatrix);
        // Considering that superposition does not perform scale transformations
        const quatRotation = new CATANA.Quaternion().setFromRotationMatrix(spMatrix);

        component.setPosition(component.position.clone().add(translation));
        component.setRotation(component.quaternion.clone().multiply(quatRotation));*/

        (src as any).rebuildRepresentations();
    },
    "Principal axes": (src: Component, srcStruct: Structure, dst: Component, dstStruct: Structure) => {
        const srcPc = srcStruct.getPrincipalAxes();
        const dstPc = dstStruct.getPrincipalAxes();

        const src2origin_rot = srcPc.getRotationQuaternion();
        const origin2dst_rot = new Quaternion().setFromRotationMatrix(dstPc.getBasisMatrix()).premultiply(dst.quaternion);
        const src2dst_rot = src2origin_rot.clone().premultiply(origin2dst_rot);

        const src2origin_pos = srcPc.center.clone().negate();
        const origin2dst_pos = dstPc.center.clone().add(dst.position);
        const src2dst_pos = src2origin_pos.clone().add(origin2dst_pos);

        src.setRotation(src2dst_rot);
        src.setPosition(src2dst_pos);
        src.updateRepresentationMatrices();
    },
    "Component placement": (src: Component, srcStruct: Structure, dst: Component, dstStruct: Structure) => {
        src.setRotation(dst.quaternion);
        src.setPosition(dst.position);
        src.updateRepresentationMatrices();
    }
}

class SuperpositionModal extends MovableModalBox {
    public constructor(component: Component, icon?: IconType) {
        super("Superpose onto other structure", false, icon);

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
        const alignmentMode = new Select(ALIGNMENT_MODES);

        const table: Table<[TextElement, Element]> = new SimpleFormTable();
        table.addRow([new TextElement("Component to align"), new TextElement(component.name)]);
        table.addRow([new TextElement("Align with"), availableStructuresSelect]);
        table.addRow([new TextElement("Alignment mode"), alignmentMode]);

        const superposeButton = new Button("Align");
        this.add(table, superposeButton)

        superposeButton.addCallback(CallbackType.CLICK, () => {
            const src = component;
            const dst = availableStructuresSelect.getComponents()[0];

            let srcStruct;
            let dstStruct;

            if (src instanceof StructureComponent) {
                srcStruct = src.structure;
            } else if (src instanceof CgStructureComponent) {
                srcStruct = src.cgStructure;
            }

            if (dst instanceof StructureComponent) {
                dstStruct = dst.structure;
            } else if (dst instanceof CgStructureComponent) {
                dstStruct = dst.cgStructure;
            }

            ALIGNMENT_FUNCTIONS[alignmentMode.getValue()](src, srcStruct, dst, dstStruct);
        });
    }
}

export default SuperpositionModal;