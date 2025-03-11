import { CallbackType } from "../element";
import Globals from "../../globals";
import ColorPicker from "../color-picker";
import Select from "../select";
import MovableModalBox from "./movable-modal-box";
import Checkbox from "../checkbox";
import CATANA from "../../catana-instance";
import {SimpleFormTable} from "../complex/table";
import TextElement from "../text-element";
import { IconType } from "../icon";
import {Color} from "catana-backend";

class SceneSettingsModal extends MovableModalBox {
    public constructor(icon?: IconType) {
        super("Scene Settings", false, icon);

        const params = Globals.stage.getParameters();

        const sceneBackgroundColorPicker = new ColorPicker(new Color(params.backgroundColor).getHexString());
        sceneBackgroundColorPicker.addCallback(CallbackType.INPUT, () => {
            Globals.stage?.setParameters({
                backgroundColor: sceneBackgroundColorPicker.getValue()
            });
        });

        const qualityOptions = ["auto", "low", "medium", "high"];
        const sceneQualitySelect = new Select(qualityOptions);
        sceneQualitySelect.addCallback(CallbackType.CHANGE, () => {
            Globals.stage?.setParameters({
                quality: sceneQualitySelect.getValue() as any
            });
        });

        const debugCheckbox = new Checkbox();
        debugCheckbox.addCallback(CallbackType.CHANGE, () => {
            CATANA.setDebug(debugCheckbox.isChecked());
            Globals.stage.viewer.requestRender();
            Globals.stage.viewer.updateBoundingBox(); // TODO Kinda hardcoded behavior, should/can be done better?
        });

        const gridHelperCheckbox = new Checkbox();
        gridHelperCheckbox.addCallback(CallbackType.CHANGE, () => {
            Globals.stage.viewer!.gridHelperVisible = gridHelperCheckbox.isChecked();
            Globals.stage.viewer.requestRender();
        });

        const originAxesCheckbox = new Checkbox();
        originAxesCheckbox.addCallback(CallbackType.CHANGE, () => {
            Globals.stage!.viewer!.originMarkerVisible = originAxesCheckbox.isChecked();
            Globals.stage.viewer.requestRender();
        });

        this.add(new SimpleFormTable()
            .addRow([new TextElement("Background color:"), sceneBackgroundColorPicker])
            .addRow([new TextElement("Graphics quality:"), sceneQualitySelect])
            .addRow([new TextElement("Show grid:"), gridHelperCheckbox])
            .addRow([new TextElement("Show origin axes:"), originAxesCheckbox])
            .addRow([new TextElement("Debug mode:"), debugCheckbox]));

        Globals.stage.signals.parametersChanged.add(() => {
            const p = Globals.stage.getParameters();
            
            sceneBackgroundColorPicker.setValue(p.backgroundColor.toString());
            sceneQualitySelect.setSelectedIndex(qualityOptions.indexOf(Globals.stage!.getParameters().quality));
            debugCheckbox.setChecked(CATANA.Debug);
        });

        Globals.stage.viewer.signals.helpersVisibilityChanged.add(() => {
            gridHelperCheckbox.setChecked(Globals.stage.viewer!.gridHelperVisible);
            originAxesCheckbox.setChecked(Globals.stage.viewer!.originMarkerVisible);
        });
    }
}

export default SceneSettingsModal;