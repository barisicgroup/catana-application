import TextElement from "../text-element";
import InputPanel from "../complex/input-panel";
import Input from "../input";
import Panel from "../panel";
import { CallbackType } from "../element";
import CATANA from "../../catana-instance";
import Globals from "../../globals";
import MovableModalBox from "./movable-modal-box";
import { IconType } from "../icon";
import Slider from "../slider";
import { SimpleFormTable } from "../complex/table";
import Button from "../button";

class CameraSettingsModal extends MovableModalBox {
    public constructor(icon?: IconType) {
        super("Camera Settings", false, icon);

        this.addClass("w-33");

        const params = Globals.stage.getParameters();
        const lastCameraScale = new CATANA.Vector3(1, 1, 1);

        // NOTE
        // In fact, we are not modifying the camera properties here
        // but properties of the respective object (translation/rotation) groups
        // due to the way NGL works!

        let gridDiv1 = new Panel().addClass("InputsGrid");

        const xAxisPosInput = new InputPanel("X", new Input("0", "number"));
        const yAxisPosInput = new InputPanel("Y", new Input("0", "number"));
        const zAxisPosInput = new InputPanel("Z", new Input("0", "number"));

        xAxisPosInput.getInput().dom.setAttribute("step", "0.1");
        yAxisPosInput.getInput().dom.setAttribute("step", "0.1");
        zAxisPosInput.getInput().dom.setAttribute("step", "0.1");

        gridDiv1.add(xAxisPosInput, yAxisPosInput, zAxisPosInput);

        let gridDiv2 = new Panel().addClass("InputsGrid");

        const xAxisRotInput = new InputPanel("X", new Input("0", "number"));
        const yAxisRotInput = new InputPanel("Y", new Input("0", "number"));
        const zAxisRotInput = new InputPanel("Z", new Input("0", "number"));

        gridDiv2.add(xAxisRotInput, yAxisRotInput, zAxisRotInput);

        const fogNearSlider = new Slider(0, 200, params.fogNear, 1);
        fogNearSlider.addCallback(CallbackType.INPUT, () => {
            fogFarSlider.setMin(fogNearSlider.getValue());
            Globals.stage?.setParameters({
                fogNear: fogNearSlider.getValue()
            });
        });

        const fogFarSlider = new Slider(0, 200, params.fogFar, 1);
        fogFarSlider.addCallback(CallbackType.INPUT, () => {
            fogNearSlider.setMax(fogFarSlider.getValue());
            Globals.stage?.setParameters({
                fogFar: fogFarSlider.getValue()
            });
        });

        const cameraNearSlider = new Slider(1, 1000, params.clipNear, 1);
        cameraNearSlider.addCallback(CallbackType.INPUT, () => {
            Globals.stage?.setParameters({
                clipNear: cameraNearSlider.getValue()
            });
        });

        const cameraFarSlider = new Slider(1, 1000, params.clipFar, 1);
        cameraFarSlider.addCallback(CallbackType.INPUT, () => {
            Globals.stage?.setParameters({
                clipFar: cameraFarSlider.getValue()
            });
        });

        const defCn = params.clipNear;
        const defCf = params.clipFar;
        const defFn = params.fogNear;
        const defFf = params.fogFar;

        const resetButton = new Button("Reset camera settings");
        resetButton.addCallback(CallbackType.CLICK, () => {
            xAxisPosInput.getInput().setValue("0");
            yAxisPosInput.getInput().setValue("0");
            zAxisPosInput.getInput().setValue("0");

            xAxisRotInput.getInput().setValue("0");
            yAxisRotInput.getInput().setValue("0");
            zAxisRotInput.getInput().setValue("0");

            onParamChange();

            Globals.stage?.setParameters({
                fogNear: defFn,
                fogFar: defFf,
                clipNear: defCn,
                clipFar: defCf
            });
        });

        const onParamChange = () => {
            const xPos = xAxisPosInput.getInput().getValue();
            const yPos = yAxisPosInput.getInput().getValue();
            const zPos = zAxisPosInput.getInput().getValue();

            const xRot = xAxisRotInput.getInput().getValue();
            const yRot = yAxisRotInput.getInput().getValue();
            const zRot = zAxisRotInput.getInput().getValue();

            if ([xPos, yPos, zPos, xRot, yRot, zRot].every(x => x.length > 0)) {

                let pos = new CATANA.Vector3(
                    parseFloat(xPos),
                    parseFloat(yPos),
                    parseFloat(zPos)
                ).negate();

                let rot = new CATANA.Quaternion().setFromEuler(
                    new CATANA.Euler(
                        CATANA.MathUtils.degToRad(parseFloat(xRot)),
                        CATANA.MathUtils.degToRad(parseFloat(yRot)),
                        CATANA.MathUtils.degToRad(parseFloat(zRot)))
                ).conjugate();

                Globals.stage!.viewerControls.orient(new CATANA.Matrix4().compose(pos, rot, lastCameraScale));
            }
        };

        xAxisPosInput.addCallback(CallbackType.INPUT, onParamChange);
        yAxisPosInput.addCallback(CallbackType.INPUT, onParamChange);
        zAxisPosInput.addCallback(CallbackType.INPUT, onParamChange);

        xAxisRotInput.addCallback(CallbackType.INPUT, onParamChange);
        yAxisRotInput.addCallback(CallbackType.INPUT, onParamChange);
        zAxisRotInput.addCallback(CallbackType.INPUT, onParamChange);

        this.add(new SimpleFormTable()
            .addRow([
                new TextElement("Position"),
                gridDiv1
            ])
            .addRow([
                new TextElement("Orientation"),
                gridDiv2
            ])
            .addRow([new TextElement("Camera near:"), cameraNearSlider])
            .addRow([new TextElement("Camera far:"), cameraFarSlider])
            .addRow([new TextElement("Fog near:"), fogNearSlider])
            .addRow([new TextElement("Fog far:"), fogFarSlider])
        ).add(resetButton);

        document.body.appendChild(this.dom);

        Globals.stage.signals.parametersChanged.add(() => {
            const p = Globals.stage.getParameters();

            cameraNearSlider.setValue(p.clipNear);
            cameraFarSlider.setValue(p.clipFar);
            fogNearSlider.setValue(p.fogNear);
            fogFarSlider.setValue(p.fogFar);
        });

        Globals.stage.viewerControls.signals.changed.add(() => {
            const sceneOrientation = Globals.stage!.viewerControls.getOrientation();

            let pos = new CATANA.Vector3();
            let rot = new CATANA.Quaternion();

            sceneOrientation.decompose(pos, rot, lastCameraScale);

            // Because we are in reality transforming the scene
            // we negate the values to make it look like we
            // transform the camera
            pos.negate();
            rot = rot.conjugate();

            const eulerRot = new CATANA.Euler().setFromQuaternion(rot);

            xAxisPosInput.getInput().setValue(pos.x.toString());
            yAxisPosInput.getInput().setValue(pos.y.toString());
            zAxisPosInput.getInput().setValue(pos.z.toString());

            xAxisRotInput.getInput().setValue(CATANA.MathUtils.radToDeg(eulerRot.x).toString());
            yAxisRotInput.getInput().setValue(CATANA.MathUtils.radToDeg(eulerRot.y).toString());
            zAxisRotInput.getInput().setValue(CATANA.MathUtils.radToDeg(eulerRot.z).toString());
        });
    }
}
export default CameraSettingsModal;
