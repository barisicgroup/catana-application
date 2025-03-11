import MovableModalBox from "./movable-modal-box";
import {IconType} from "../icon";
import TextElement from "../text-element";
import Button from "../button";
import {CallbackType} from "../element";
import Globals from "../../globals";
import SpinBox from "../spin-box";
import RadioGroupPanel from "../complex/radio-group.panel";
import ColorPicker from "../color-picker";
import {SimpleFormTable} from "../complex/table";
import {Component} from "catana-backend";
import CollapsiblePanel from "../complex/collapsible-panel";
import {ComponentsSelect} from "../specialized/component/component";
import Separator from "../separator";
import Panel, {PanelOrientation} from "../panel";
import Select from "../select";
import Slider from "../slider";
import Checkbox from "../checkbox";

class CollisionModal extends MovableModalBox {
    public constructor() {
        super("Collision detection", false, IconType.COLLISION);

        const description = new TextElement()
            .t("Select structures for collision detection")
            .br()
            .t("Or press 'Start' to include all structures");
        const componentSelector = new ComponentsSelect(["structure", "cg-structure"], undefined, true).setAllSelected();
        const collisionOptionsPanel = new CollapsiblePanel(new TextElement("Configurations"));
        //const collisionErrorPanel = new TitledPanel("Collision information");
        const collisionErrorPanel = new CollapsiblePanel(new TextElement("Imprecision info")).setCollapsed(true);
        //const markerOptions = new TitledPanel("Marker parameters");
        const markerOptions = new CollapsiblePanel(new TextElement("Visual parameters")).setCollapsed(true);
        const button = new Button();

        // Collision options/configuration
        const lenience = new SpinBox(0, 0, 10, 0.01).addCallback(CallbackType.INPUT, () => {
            const collision = Globals.stage.catanaCollision;
            if (!collision) return;
            updateParams({lenience: lenience.getValue()});
        });
        {
            const table = new SimpleFormTable();

            table.addRow([new TextElement("Lenience (Å)")/*TODO .setTitle()*/, lenience]);
            collisionOptionsPanel.add(table);
        }

        // Collision information
        const updateInfo = () => {
            collisionErrorPanel.clear();
            if (!Globals.stage.isCollisionOn() || !Globals.stage.catanaCollision) {
                // TODO some error message or something?
                return;
            }
            /*collisionErrorPanel.add(new TextElement("During collision detection, when a component is moved around " +
                "too much, the collision detection becomes increasingly imprecise. To regain precision, 'Stop' the " +
                "collision detection and 'Start' it again."));*/
            collisionErrorPanel.add(new TextElement("During collision detection, when a component is moved " +
                "around too much, the collision detection becomes increasingly imprecise. To regain precision, 'Stop' " +
                "the collision detection and 'Start' it again."));

            collisionErrorPanel.add(new Separator());

            const errors: Map<Component, TextElement> = new Map<Component, TextElement>();
            const table = new SimpleFormTable(["Component", "Imprecision"]);
            for (const c of Globals.stage.catanaCollision.components) {
                const _error = Globals.stage.catanaCollision.getError(c);
                const component = new TextElement(c.name);
                const error = new TextElement(CollisionModal.formatError(_error));
                errors.set(c, error);
                /*const recalculate = new IconButton(IconType.REFRESH, undefined, ButtonType.MINI)
                    .addCallback(CallbackType.CLICK, () => {
                        Globals.stage.catanaCollision!.recalculate(c);
                    });*/
                table.addRow([component, error]);
            }
            Globals.stage.catanaCollision.signals.errorChanged.add((c: Component, error: null | number) => {
                errors.get(c)!.setText(CollisionModal.formatError(error)); // TODO: remove '!'
            });
            collisionErrorPanel.add(table);
        };

        // Marker options
        const table = new SimpleFormTable();
        const updateParams = (params: { radius?: number, mode?: "x" | "o", color?: string, opacity?: number, lenience?: number, thickness?: number }) => {
            const collision = Globals.stage.catanaCollision;
            if (!collision) return;
            if (params.lenience !== undefined) {
                collision.setCollisionParams(params as {lenience: number});
                if (params.radius === undefined && radiusModes.getValue() === COV_LEN) {
                    params.radius = getRadius();
                }
            }
            collision.setRenderingParams(params);
        };
        const getMode = () => mode.getValue()!.toLowerCase() as "x" | "o";

        /*const radiusCheckBox = new Checkbox(false).addCallback(CallbackType.CLICK, () => {
            radius.setVisible(radiusCheckBox.isChecked());
            updateParams({ radius: getRadius() });
        });*/
        const COV_LEN = "Match collision";
        const COV = "Covalent";
        const UNI = "Uniform";
        const radiusModes = new Select([COV_LEN, COV, UNI])
            .addCallback(CallbackType.CHANGE, () => updateParams({radius: getRadius()}));
        const radius = new SpinBox(0.25, 0.05, 5, 0.05)
            .addCallback(CallbackType.INPUT, () => updateParams({radius: radius.getValue()}))
            .setVisible(false);
        const radiusPanel = new Panel(PanelOrientation.HORIZONTAL).add(radiusModes, radius);
        const getRadius: () => number = () => {
            let value;
            switch (radiusModes.getValue()) {
                case UNI:
                    radius.setVisible(true);
                    value = radius.getValue();
                    break;
                default:
                    console.error("Unexpected value " + radiusModes.getValue() + " selected in RadiusMode " +
                        "checkbox for collision rendering (marker options). Using Covalent with lenience " +
                        "adjustment instead.");
                    radiusModes.setSelectedIndex(0);
                // Fallthrough
                case COV_LEN:
                    value = -1;
                    radius.setVisible(false);
                    break;
                case COV:
                    value = -2;
                    radius.setVisible(false);
                    break;
            }
            return value;
        };

        const mode = new RadioGroupPanel(["O", "X"])
            .addCallback(CallbackType.CLICK, () => updateParams({mode: getMode()}));
        const color = new ColorPicker("#00ff00")
            .addCallback(CallbackType.INPUT, () => updateParams({color: color.getValue()}));
        const opacity = new Slider(0, 255, 255, 1)
            //.addCallback(CallbackType.INPUT, () => updateParams({opacity: opacity.getValueNormalized()}));
            .addCallback(CallbackType.INPUT, () => Globals.stage.catanaCollision!.domElement.style.opacity = "" + opacity.getValueNormalized());
        const thickness = new Slider(1, 1000, 200, 1)
            .addCallback(CallbackType.INPUT, () => updateParams({thickness: thickness.getValueNormalized()}));
        const box = new Checkbox(true)
            .addCallback(CallbackType.CLICK, () => {
                Globals.stage.catanaCollision!.setBoxVisible(box.isChecked());
                Globals.stage.viewer.requestRender();
            });

        table.addRow([new TextElement("Radius (Å)"), radiusPanel]);
        table.addRow([new TextElement("Shape"), mode]);
        table.addRow([new TextElement("Color"), color]);
        table.addRow([new TextElement("Opacity"), opacity]);
        table.addRow([new TextElement("Thickness"), thickness]);
        table.addRow([new TextElement("Show boundaries"), box]);
        markerOptions.add(table);

        const updateCollision = () => {
            const on = Globals.stage.isCollisionOn();
            button.setText(on ? "Stop" : "Start");
            collisionOptionsPanel.setVisible(on);
            collisionErrorPanel.setVisible(on);
            markerOptions.setVisible(on);
            componentSelector.setVisible(!on);
            description.setVisible(!on);
            updateInfo();
        }
        updateCollision();

        button.addCallback(CallbackType.CLICK, () => {
            button.setEnabled(false);
            button.setText("Starting...");
            let components: any = componentSelector.getComponents();
            if (components.length === 0) componentSelector.setAllSelected();
            components = componentSelector.getComponents();
            if (components.length === 0) {
                console.error("Something went wrong in starting collision detection. " +
                    "Even after setting componentSelector to have all components selected, getComponents still " +
                    "returned no components. Attempting to start collision detection with fromStage...");
                components = undefined;
            }
            Globals.stage.toggleCollisions(components, getRadius(), getMode(), color.getValue(), 1, lenience.getValue(), thickness.getValueNormalized()).then(() => {
                updateCollision();
                button.setEnabled(true);
            });
        });

        this.add(
            description, componentSelector,                            // Before collision starts
            collisionErrorPanel, collisionOptionsPanel, markerOptions, // After collision starts
            button
        );
    }

    private static formatError(error: null | number): string {
        if (error === null) return "?";
        if (error === 0) return "0";
        if (error < 0.01) {
            const exponential = error.toExponential();
            const eIndex = exponential.indexOf("e");
            return "~1⁻" + this.superscript(exponential.substring(eIndex + 2));
        }
        return "~" + error.toFixed(2);
    }

    private static superscript(num: number | string): string {
        return ("" + num)
            //.replace(/\+/, "⁺")
            //.replace(/-/, "⁻")
            .replace(/0/, "⁰")
            .replace(/1/, "¹")
            .replace(/2/, "²")
            .replace(/3/, "³")
            .replace(/4/, "⁴")
            .replace(/5/, "⁵")
            .replace(/6/, "⁶")
            .replace(/7/, "⁷")
            .replace(/8/, "⁸")
            .replace(/9/, "⁹");
    }
}

export default CollisionModal;