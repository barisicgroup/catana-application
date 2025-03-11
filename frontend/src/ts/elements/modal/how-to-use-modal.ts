import ModalBox from "./modal-box";
import { IconText, IconType } from "../icon";
import TextElement from "../text-element";
import IconTextCollapsiblePanel from "../complex/icontext-collapsible-panel";
import List from "../list";

class HowToUseModal extends ModalBox {
    public constructor(icon?: IconType) {
        super("How To Use", false, icon);

        const controlsPanel = new IconTextCollapsiblePanel("Scene Controls");
        controlsPanel.setCollapsed(true);
        controlsPanel.add(new List(
            "Click with middle mouse button to select an object as the center of rotation.",
            "Hold left mouse button to rotate around the center of rotation.",
            "Hold middle mouse button and move the mouse or use mouse scroll wheel to zoom in and out.",
            "Hold right mouse button to translate/pan the camera along the screen plane.",
        ));

        const componentsPanel = new IconTextCollapsiblePanel("Components (Right Bar)");
        componentsPanel.setCollapsed(true);
        componentsPanel.add(new TextElement("Components are independent subsystems (structures, lattices, ...) " +
            "loaded into Catana. The right bar lists all the components in the Workspace panel, while the Inspector shows details of the selected component. There are following core types of components:"));
        componentsPanel.add(new List(
            new IconText(IconType.STRUCTURE, "Component representing all-atom structure."),
            new List(
                "To access tools for the manipulation of all-atom structures, choose the layout " +
                "\"All-atom modelling\" in the top bar."),
            new IconText(IconType.CG_STRUCTURE, "Component representing coarse-grained structure."),
            new List(
                "To access tools for the manipulation of coarse-grained structures, choose the layout " +
                "\"Coarse-grained modelling\" in the top bar."),
            new IconText(IconType.HONEYCOMB_LATTICE, "Component representing DNA origami lattice in honeycomb " +
                "arrangement"),
            new IconText(IconType.SQUARE_LATTICE, "Component representing DNA origami lattice in square " +
                "arrangement"),
        ),
            new TextElement("For each component in the Workspace panel, two additional buttons are shown:"),
            new List(
                new IconText(IconType.EYE, "Shows/hides this component"),
                new IconText(IconType.LOCK, "Locks/unclocks this component, i.e., making it (im)possible to move it around")
            )
        );

        const leftBarMenuPanel = new IconTextCollapsiblePanel("Controls Menu (Left Bar)");
        leftBarMenuPanel.setCollapsed(true);
        leftBarMenuPanel.add(
            new TextElement("Allows for modifications of the structures."),
            new TextElement("Choose a layout in the top bar to see the controls relevant for the kind of " +
                "modelling you wish to perform."));
        leftBarMenuPanel.add(
            new List(
                new IconText(IconType.CG_STRUCTURE, "Coarse-grained structure subsection provides tools for " +
                    "modification and in silico modeling on the coarse-grained level."),
                new IconText(IconType.STRUCTURE, "All-atom structures subsection provides means for modification " +
                    "of fully atomistic structures."),
            )
        );

        const gizmoPanel = new IconTextCollapsiblePanel("Gizmo panel (Top Right Bar)");
        gizmoPanel.setCollapsed(true);
        gizmoPanel.add(
            new TextElement("Allows to show/hide gizmos for translation and rotation, and modify their behavior."),
            new List(
                new IconText(IconType.TRANSFORM_TRANSLATE, "Move (translate) component mode."),
                new List(
                    "Drag a component in the 3D view to move it along a camera-aligned plane.",
                    "Click on a component in the 3D view to show a translation gizmo at the clicked position."),
                new IconText(IconType.TRANSFORM_ROTATE, "Rotate component mode."),
                new List(
                    "Drag a component in the 3D view to rotate it around the point where the dragging starts.",
                    "Click on a component in the 3D view to show a rotation gizmo at the clicked position."
                ))
        );

        const structureImportPanel = new IconTextCollapsiblePanel("Importing or Creating New Structure");
        structureImportPanel.setCollapsed(true);
        structureImportPanel.add(new TextElement("To import new structure, open Structure -> Import... dialog. You can load a structure from the available databases or upload a local file stored in one of many supported file formats."));
        structureImportPanel.add(new TextElement("To create structures from scratch, use the Structure -> Create... dialog allowing to design DNA strands and small peptides."));

        const structureExportPanel = new IconTextCollapsiblePanel("Exporting the Structure");
        structureExportPanel.setCollapsed(true);
        structureExportPanel.add(new TextElement("To export the structure, open Structure -> Export... dialog. Catana currently supports export to PDB, UNF, FASTA, and as a screenshot. " +
            "Multiple structures/components can be selected for export and then exported as one, allowing for fusing different files."));

        const alphaFoldPanel = new IconTextCollapsiblePanel("Structure Prediction");
        alphaFoldPanel.setCollapsed(true);
        alphaFoldPanel.add(new TextElement("To start a new structure prediction, go to Structure -> Predict... dialog. " +
            "Here, you can initiate new prediction based on your desired sequence, and check the status of submitted predictions."));

        this.add(controlsPanel);
        this.add(componentsPanel);
        this.add(leftBarMenuPanel);
        this.add(gizmoPanel);
        this.add(structureImportPanel);
        this.add(structureExportPanel);
        this.add(alphaFoldPanel);

        document.body.appendChild(this.dom);
    }
}

export default HowToUseModal;