import Panel, { PanelOrientation } from "../../panel";
import { IconButton, IconToggle, IconType } from "../../icon";
import { CallbackType } from "../../element";
import Globals from "../../../globals";
import SuperpositionModal from "../../modal/superposition-modal";
import MergeModal from "../../modal/merge-modal";
import CATANA from "../../../catana-instance";
import { CgStructureComponent, Component, StructureComponent, convertCgStrucCompToAaStrucComp, convertAaStrucCompToCgStrucComp } from "catana-backend";
import { ToggleState } from "../../toggle";

export default class ComponentActions extends Panel {

    private readonly removeSignals: () => void;

    public constructor(component: Component) {
        super(PanelOrientation.VERTICAL);
        this.addClass("ComponentActionsPanel");

        const hideToggle = new IconToggle(ToggleState.ON, IconType.EYE, IconType.EYE_SLASH, "Make invisible", "Make visible"); {
            hideToggle.setTitle("Show/hide");
            hideToggle.addCallback(CallbackType.CLICK, () => {
                if (hideToggle.isOn()) {
                    Globals.stage?.viewer.smartSelect(component);
                } else {
                    Globals.stage?.viewer.unselect();
                }
                component.setVisibility(hideToggle.isOn());
            });
            const visibilityChangedFun = () => {
                if (hideToggle.isOn() !== component.visible) {
                    hideToggle.setState(component.visible ? ToggleState.ON : ToggleState.OFF);
                }
            }
            component.signals.visibilityChanged.add(visibilityChangedFun);
            this.removeSignals = () => {
                component.signals.visibilityChanged.remove(visibilityChangedFun);
            };
        }
        const centerButton = new IconButton(IconType.TARGET, "Center"); {
            centerButton.setTitle("Center view");
            centerButton.addCallback(CallbackType.CLICK, () => component.autoView(500));
        }
        const superpositionModal = new SuperpositionModal(component, IconType.SUPERPOSE); {
            document.body.appendChild(superpositionModal.dom);
        }
        const mergeModal = new MergeModal(component, IconType.UNION); {
            document.body.appendChild(mergeModal.dom);
        }
        const convertToCgButton = new IconButton(IconType.CG_STRUCTURE, "Convert to coarse-grained"); {
            convertToCgButton.addCallback(CallbackType.CLICK, () => {
                if (!(component instanceof StructureComponent)) {
                    return;
                }

                Globals.animatedLoader?.show();
                // Adding setTimeout with a short delay allows the animated loader to be shown
                // before a long blocking call is made
                setTimeout(() => convertAaStrucCompToCgStrucComp(Globals.stage, component).finally(() => {
                    Globals.tooltip?.deactivate();
                    Globals.animatedLoader?.hide();
                }), 16);
            });
        }
        const convertToAaButton = new IconButton(IconType.STRUCTURE, "Convert to all-atom"); {
            convertToAaButton.addCallback(CallbackType.CLICK, () => {
                if (!(component instanceof CgStructureComponent)) {
                    return;
                }

                Globals.animatedLoader?.show();
                setTimeout(() => convertCgStrucCompToAaStrucComp(Globals.stage, component).finally(() => {
                    Globals.tooltip?.deactivate();
                    Globals.animatedLoader?.hide();
                }), 16);
            });
        }
        const superposeButton = new IconButton(IconType.SUPERPOSE, "Align with..."); {
            superposeButton.addCallback(CallbackType.CLICK, () => superpositionModal.show());
        }
        const mergeButton = new IconButton(IconType.UNION, "Merge with..."); {
            mergeButton.addCallback(CallbackType.CLICK, () => mergeModal.show());
        }
        const duplicateButton = new IconButton(IconType.DUPLICATE, "Duplicate"); {
            duplicateButton.addCallback(CallbackType.CLICK, () => {
                if (component instanceof StructureComponent || component instanceof CgStructureComponent) {
                    CATANA.duplicateComponentContainingStructure(Globals.stage!, component);
                }
            });
        }
        const trashButton = new IconButton(IconType.TRASH, "Delete"); {
            trashButton.addCallback(CallbackType.CLICK, () => {
                Globals.stage?.removeComponent(component);
                Globals.tooltip?.deactivate();
            });
        }

        const autoDetectBpButton = new IconButton(IconType.DETECT_BASE_PAIRS, "Detect base-pairs"); {
            autoDetectBpButton.addCallback(CallbackType.CLICK, () => {
                if (component instanceof CgStructureComponent) {
                    Globals.animatedLoader?.show();
                    setTimeout(() => {
                        component.cgStructure.generateBasePairs();
                        Globals.animatedLoader?.hide();
                        component.updateRepresentations({});
                    }, 16);
                }
            });
        }

        this.add(hideToggle, centerButton, superposeButton, trashButton);

        if (component.type === "structure") {
            this.add(convertToCgButton);
        } else if (component.type === "cg-structure") {
            this.add(convertToAaButton);
            this.add(autoDetectBpButton);
        }

        if (component.type.endsWith("structure")) {
            this.add(superposeButton);
            this.add(mergeButton);
            this.add(duplicateButton);
        }
    }

    public dispose() {
        super.dispose();
        this.removeSignals();
        return this;
    }
}
