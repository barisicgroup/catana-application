import {Component, Euler, MathUtils, Quaternion, Vector3} from "catana-backend";
import Panel, {PanelOrientation} from "../../panel";
import Table, {TableType} from "../../complex/table";
import Icon, {IconText, IconToggle, IconType} from "../../icon";
import SpinBox from "../../spin-box";
import {CallbackType} from "../../element";
import {ToggleState} from "../../toggle";

type Row = [Icon, SpinBox, SpinBox, SpinBox];

class ComponentPlacement extends Panel {

    private readonly translation: [SpinBox, SpinBox, SpinBox];
    private readonly rotation: [SpinBox, SpinBox, SpinBox];

    private readonly removeComponentCallbacks: () => void;

    private block: boolean = false;

    public constructor(c: Component) {
        super(PanelOrientation.VERTICAL);

        const sb = (): SpinBox => new SpinBox(0, -10000, 10000, 0.1);
        this.translation = [sb(), sb(), sb()];
        this.rotation = [sb(), sb(), sb()];

        // Set up callbacks: UI -> Component
        const updateTranslation = () => this.runSafely(() => { if (this.isPositionValid()) c.setPosition(this.getPosition()) });
        const updateRotation = () => this.runSafely(() => { if (this.isRotationValid()) c.setRotation(this.getQuaternion()) });
        for (let i = 0; i < 3; ++i) {
            this.translation[i].addCallback(CallbackType.INPUT, updateTranslation);
            this.rotation[i].addCallback(CallbackType.INPUT, updateRotation);
        }

        const lockTransformationsButton = new IconToggle(c.locked ? ToggleState.ON : ToggleState.OFF, IconType.LOCK, IconType.UNLOCK, "Unlock movement", "Lock movement");
        lockTransformationsButton.addCallback(CallbackType.CLICK, () => {
            c.setLocked(lockTransformationsButton.isOn());
        })

        // Set up callbacks: Component -> UI
        const componentMatrixChangedCallback = () => this.runSafely(() => {
            this.translation[0].setValue(c.position.x);
            this.translation[1].setValue(c.position.y);
            this.translation[2].setValue(c.position.z);
            const rotation = new Euler().setFromQuaternion(c.quaternion);
            this.rotation[0].setValue(rotation.x * MathUtils.RAD2DEG);
            this.rotation[1].setValue(rotation.y * MathUtils.RAD2DEG);
            this.rotation[2].setValue(rotation.z * MathUtils.RAD2DEG);
        });

        const componentLockedChangedCallback = () => this.runSafely(() => {
            this.translation[0].setEnabled(!c.locked);
            this.translation[1].setEnabled(!c.locked);
            this.translation[2].setEnabled(!c.locked);
            this.rotation[0].setEnabled(!c.locked);
            this.rotation[1].setEnabled(!c.locked);
            this.rotation[2].setEnabled(!c.locked);
            lockTransformationsButton.setState(c.locked ? ToggleState.ON : ToggleState.OFF);
        });

        c.signals.matrixChanged.add(componentMatrixChangedCallback);
        c.signals.lockedChanged.add(componentLockedChangedCallback);

        this.removeComponentCallbacks = () => {
            c.signals.matrixChanged.remove(componentMatrixChangedCallback);
            c.signals.lockedChanged.remove(componentLockedChangedCallback);
        };

        // Call callbacks to set the state of UI to current status of component
        componentMatrixChangedCallback();
        componentLockedChangedCallback();

        // Set up UI
        const table = new Table<Row>(
            4, TableType.FORM, false, false, [0, 1, 1, 1], ["", "X", "Y", "Z"])
            .addRow([new IconText(IconType.TRANSFORM_TRANSLATE, "Å"), ...this.translation])
            .addRow([new IconText(IconType.TRANSFORM_ROTATE, "deg"), ...this.rotation]);
        this.add(table, lockTransformationsButton);
    }

    private runSafely(runnable: () => void) {
        if (this.block) return;
        this.block = true;
        runnable();
        this.block = false;
    }

    public getPosition(): Vector3 {
        return new Vector3(
            this.translation[0].getValue(),
            this.translation[1].getValue(),
            this.translation[2].getValue());
    }

    public getEuler(): Euler {
        return new Euler(
            MathUtils.degToRad(this.rotation[0].getValue()),
            MathUtils.degToRad(this.rotation[1].getValue()),
            MathUtils.degToRad(this.rotation[2].getValue()));
    }

    public isPositionValid(): boolean {
        return !this.translation[0].isEmpty() &&
            !this.translation[1].isEmpty() &&
            !this.translation[2].isEmpty();
    }

    public isRotationValid(): boolean {
        return !this.rotation[0].isEmpty() &&
            !this.rotation[1].isEmpty() &&
            !this.rotation[2].isEmpty();
    }

    public getQuaternion(): Quaternion {
        return new Quaternion().setFromEuler(this.getEuler());
    }

    public dispose() {
        super.dispose();
        this.removeComponentCallbacks();
        return this;
    }
}

export default ComponentPlacement;