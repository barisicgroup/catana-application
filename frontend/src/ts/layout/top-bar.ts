import { Callback, CallbackType } from "../elements/element";
import { StructurePredictorModalBox } from "../elements/modal/structure-predictor";
import Dropdown, { DropdownType } from "../elements/complex/dropdown";
import AboutModal from "../elements/modal/about-modal";
import ServicesStatusModal from "../elements/modal/services-status-modal";
import HowToUseModal from "../elements/modal/how-to-use-modal";
import SaveFileModal from "../elements/modal/save-file-modal";
import OpenFileModal from "../elements/modal/open-file-modal";
import CameraSettingsModal from "../elements/modal/camera-settings-modal";
import SceneSettingsModal from "../elements/modal/scene-settings-modal";
import StructureAnalysisModal from "../elements/modal/structure-analysis-modal";
import IframeModal from "../elements/modal/iframe-modal";
import ScriptEditorModal from "../elements/modal/script-editor-modal";
import PluginManagementModal from "../elements/modal/plugin-management-modal";
import { IconButton, IconDropdown, IconType } from "../elements/icon";
import Globals from "../globals";
import TutorialGuidedTour from "../tutorial-guided-tour";
import Toggle, { ToggleState } from "../elements/toggle";
import MainPanel from "./main-panel";
import { PanelOrientation } from "../elements/panel";
import StrucConfigModal from "../elements/modal/struc-config-modal";
import CreateStructureModal from "../elements/modal/create-structure-modal";
import RigidBodyDynamicsModal from "../elements/modal/rigidbody-dynamics-modal";
import RelaxationModal from "../elements/modal/relaxation-modal";
import CollisionModal from "../elements/modal/collision-modal";
import ViewTrajectoryModal from "../elements/modal/view-trajectory-modal";
import ScriptCreatedModal from "../elements/modal/script-created-modal";
import { ButtonType } from "../elements/button";
import Separator from "../elements/separator";
import TextElement from "../elements/text-element";
import { PluginUIModal } from "catana-backend";

class TopBar extends MainPanel {

    private readonly layoutsDropdown: Dropdown;

    private readonly toggles: { [id: string]: Toggle } = {};

    private readonly layoutSelectedCallback: ((id: string) => void)[] = [];

    public constructor() {
        super(PanelOrientation.HORIZONTAL);

        const openFileModalBox = new OpenFileModal(IconType.OPEN).setId("importModal");
        const saveFileModalBox = new SaveFileModal(IconType.SAVE).setId("exportModal");
        const structurePredictorModalBox = new StructurePredictorModalBox(IconType.MAGIC);
        const structureAnalysisModalBox = new StructureAnalysisModal(IconType.EYE);
        const viewTrajectoryModalBox = new ViewTrajectoryModal(IconType.PLAY_CIRCLE);
        const strucConfigModal = new StrucConfigModal(IconType.SETTINGS);
        const createStructureModal = new CreateStructureModal(IconType.CREATE);
        const cameraSettingsModalBox = new CameraSettingsModal(IconType.CAMERA);
        const lightingSettingsModalBox = new SceneSettingsModal(IconType.SETTINGS);
        const howToUseModalBox = new HowToUseModal(IconType.QUESTION_CIRCLE);
        const aboutModalBox = new AboutModal(IconType.INFO_CIRCLE).setId("aboutModal");
        const servicesStatusModal = new ServicesStatusModal(IconType.SERVER);
        const manualModalBox = new IframeModal("User Manual", "https://catana.ait.ac.at/manual/");
        const rigidbodyDynamicsModal = new RigidBodyDynamicsModal();
        const relaxationModal = new RelaxationModal();
        const collisionModal = new CollisionModal().setId("collisionDetectionModal");
        const scriptEditorModal = new ScriptEditorModal(IconType.CODE);
        const pluginManageModal = new PluginManagementModal(IconType.SETTINGS);

        const fileDropdown = new Dropdown("Structure").add(
            TopBar.createDropdownButton(IconType.CREATE, "Create", () => createStructureModal.show()),
            TopBar.createDropdownButton(IconType.OPEN, "Import", () => openFileModalBox.show()),
            TopBar.createDropdownButton(IconType.SAVE, "Export", () => saveFileModalBox.show()),
            TopBar.createDropdownButton(IconType.MAGIC, "Predict", () => structurePredictorModalBox.show()),
            TopBar.createDropdownButton(IconType.EYE, "Analysis", () => structureAnalysisModalBox.show()),
            TopBar.createDropdownButton(IconType.SETTINGS, "Configurations", () => strucConfigModal.show()));

        const dynamicsDropdown = new Dropdown("Dynamics").add(
            TopBar.createDropdownButton(IconType.RIGIDBODY_DYNAMICS, "Rigid body", () => rigidbodyDynamicsModal.show()),
            TopBar.createDropdownButton(IconType.RELAXATION, "Relaxation", () => relaxationModal.show()),
            TopBar.createDropdownButton(IconType.COLLISION, "Collision", () => collisionModal.show()),
            TopBar.createDropdownButton(IconType.PLAY_CIRCLE, "View trajectory", () => viewTrajectoryModalBox.show())
        );

        const sceneDropdown = new Dropdown("Scene").add(
            TopBar.createDropdownButton(IconType.SETTINGS, "Scene Settings", () => lightingSettingsModalBox.show()),
            TopBar.createDropdownButton(IconType.CAMERA, "Camera Settings", () => cameraSettingsModalBox.show()));

        this.layoutsDropdown = new Dropdown("Layout");
        this.layoutsDropdown.setId("layoutsDropdown");

        const pluginsDropdown = new Dropdown("Plugins").add(
            TopBar.createDropdownButton(IconType.SETTINGS, "Manage", () => pluginManageModal.show()),
            TopBar.createDropdownButton(IconType.CODE, "Script Editor", () => scriptEditorModal.show()),
        );

        const helpDropdown = new Dropdown("Help"); {
            helpDropdown.add(
                TopBar.createDropdownButton(IconType.QUESTION_CIRCLE, "How To Use", () => howToUseModalBox.show()),
                TopBar.createDropdownButton(IconType.MANUAL, "User Manual", () => manualModalBox.show()),
                TopBar.createDropdownButton(IconType.TOUR, "User Interface Tour", () => {
                    TutorialGuidedTour.run(Globals.stage!, Globals.animatedLoader);
                }),
                TopBar.createDropdownButton(IconType.FILTER, "Filtering", () => Globals.filteringModalBox.show()),
                TopBar.createDropdownButton(IconType.BUG, "Bug Report", () => Globals.bugReport.show()),
                TopBar.createDropdownButton(IconType.SERVER, "Status of Services", () => servicesStatusModal.show()),
                TopBar.createDropdownButton(IconType.INFO_CIRCLE, "About", () => aboutModalBox.show())
            );
        }

        // Other actions (center, translate, rotate...)
        const otherActionsButtons = Globals.actionsManager.other.map(v => v(ButtonType.MINI));

        // Orientation selection (global, local, principal...)
        const orientation = new IconDropdown(undefined, undefined, DropdownType.MINI);
        const buttons: IconButton[] = [];
        const addOrientation = (icon: IconType, text: string, transformOrientation: "global" | "local" | "principal", select: boolean = false) => {
            const button = new IconButton(icon, text).addCallback(CallbackType.CLICK, () => {
                for (const b of buttons) b.setSelected(false);
                button.setSelected(true);
                orientation.setIcon(icon);
                Globals.actionsManager.stateData.transformOrientation = transformOrientation;
                Globals.stage.viewer.requestRender();
            });
            if (select) {
                button.setSelected(true);
                orientation.setIcon(icon);
                Globals.actionsManager.catanaStateData.transformOrientation = transformOrientation;
            }
            buttons.push(button);
            orientation.add(button);
        };
        orientation.add(new TextElement("Movement orientation"));
        orientation.add(new Separator());
        addOrientation(IconType.GLOBAL, "World (Global)", "global", true);
        addOrientation(IconType.LOCAL, "Component (Local)", "local");
        addOrientation(IconType.PRINCIPAL_COMPONENTS, "Principal", "principal");

        // Add to top bar
        this.start.add(fileDropdown, dynamicsDropdown, sceneDropdown, this.layoutsDropdown, pluginsDropdown, helpDropdown);
        this.end.add(...otherActionsButtons, new Separator(), orientation);

        // Events
        Globals.stage.pluginManager.signals.modalWindowRequested.add(
            (modalData: PluginUIModal) => this.onPluginModalRequested(pluginsDropdown, modalData));
    }

    private static createDropdownButton(icon: IconType, text: string, callback: Callback) {
        const dropdownButton = new IconButton(icon, text);
        dropdownButton.addCallback(CallbackType.CLICK, callback);
        return dropdownButton;
    }


    public addOnLayoutSelectedCallback(callback: (id: string) => void) {
        this.layoutSelectedCallback.push(callback);
    }

    public addLayout(id: string, name: string) {
        if (this.toggles[id]) this.toggles[id].dispose();
        const toggle = new Toggle(ToggleState.OFF, name)
            .addCallback(CallbackType.CLICK, () => {
                if (!toggle.isOn()) {
                    toggle.setState(ToggleState.ON);
                } else {
                    this.setLayout(id);
                    for (const c of this.layoutSelectedCallback) c(id);
                }
            });
        this.toggles[id] = toggle;
        this.layoutsDropdown.add(toggle);
    }

    public setLayout(id: string) {
        const toggle = this.toggles[id];
        if (!toggle) return;
        for (const t of Object.values(this.toggles)) {
            t.setState(ToggleState.OFF);
            t.setSelected(false);
        }
        toggle.setState(ToggleState.ON);
        toggle.setSelected(true);
    }

    public static getHeight(): number {
        return TopBar.NARROW;
    }

    public setDimensionsRem(dim: { height: number, right: number }) {
        this.getStyle().height = dim.height + "rem";
        this.getStyle().right = dim.right + "rem";
        this.setVisible(!!dim.height);
    }

    private onPluginModalRequested(targetDropdown: Dropdown, modalData: PluginUIModal): void {
        const newModal = new ScriptCreatedModal(modalData);

        targetDropdown.add(
            TopBar.createDropdownButton(IconType.PLUGIN_EXTENSION, modalData.title, () => newModal.show()));
    }
}

export default TopBar;