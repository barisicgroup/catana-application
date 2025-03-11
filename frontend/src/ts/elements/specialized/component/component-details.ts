import Panel, { PanelOrientation } from "../../panel";
import TextElement from "../../text-element";
import Input from "../../input";
import Element, { CallbackType } from "../../element";
import { CgStructureComponent, Component, StructureComponent } from "catana-backend";
import TextArea from "../../text-area";
import Select from "../../select";
import Table, {SimpleFormTable} from "../../complex/table";

export default class ComponentDetails<C extends Component> extends Panel {
    protected readonly c: C;
    private readonly compNameChanged: (name: string) => void;

    protected readonly table: Table;

    protected constructor(c: C) {
        super(PanelOrientation.VERTICAL);
        this.addClass("ComponentDetailsPanel");
        this.c = c;

        // Set up elements
        const compName = new Input(this.c.name)
            .addCallback(CallbackType.INPUT, () => {
                this.c.setName(compName.getValue());
            });

        // Build table
        this.table = new SimpleFormTable();
        this.addRow("Component type:", c.type);
        this.addRow("Component name:", compName);

        // Add to this element
        this.add(this.table);

        // Set up signals
        this.compNameChanged = (name: string) => {
            compName.setValue(name);
        };
        this.c.signals.nameChanged.add(this.compNameChanged);
    }

    protected addRow(_name: string, _content: string | Element) {
        const name = new TextElement(_name);
        const content = _content instanceof Element ? _content : new TextElement(_content);
        this.table.addRow([name, content]);
    }

    public dispose() {
        super.dispose();
        this.c.signals.nameChanged.remove(this.compNameChanged);
        return this;
    }

    public static getComponentDetails(c: Component): ComponentDetails<any> {
        if (c instanceof StructureComponent) return new StructureComponentDetails(c);
        if (c instanceof CgStructureComponent) return new CgStructureComponentDetails(c);
        return new ComponentDetails<any>(c);
    }
}

class CgStructureComponentDetails extends ComponentDetails<CgStructureComponent> {
    //private readonly strucNameChanged: (name: string) => void;
    public constructor(c: CgStructureComponent) {
        super(c);
        const structure = c.cgStructure;

        // Set up elements
        const strucName = new Input(structure.name)
            .addCallback(CallbackType.INPUT, () => {
                structure.name = strucName.getValue();
            });
        //this.strucNameChanged = (name: string) => {
        //strucName.getInput().setValue(name);
        //};
        //structure.signals.nameChanged.add(this.strucNameChanged); // TODO: Create signal for struc name change?

        // Add rows to table
        this.addRow("Structure name:", strucName)

        // Set up structural parts table
        const partsCountInfo = new TextArea().setEditable(false);
        // TODO update this info when there's a change?
        const strucInfo = structure.toString().split("\n");
        strucInfo.forEach(str => {
            partsCountInfo.addRow(str);
        });

        // Add to this element
        this.add(
            new TextElement("Structural parts:"),
            partsCountInfo);
    }
    public dispose() {
        super.dispose();
        // TODO: structure.signals.nameChanged.remove(this.strucNameChanged);
        return this;
    }
}

class StructureComponentDetails extends ComponentDetails<StructureComponent> {
    public constructor(c: StructureComponent) {
        super(c);
        const structure = this.c.structure;

        // Set up elements
        let assemblyOptions: string[] = [];
        for (let assembly in structure.biomolDict) {
            assemblyOptions.push(assembly);
        }
        if (assemblyOptions.length === 0) {
            assemblyOptions.push("FULL");
        }
        const strucAssemblySelect = new Select(assemblyOptions, false);
        if (this.c.parameters.defaultAssembly.length > 0) {
            strucAssemblySelect.setValue(this.c.parameters.defaultAssembly);
        }
        strucAssemblySelect.addCallback(CallbackType.CHANGE, () => {
            this.c.setDefaultAssembly(strucAssemblySelect.getValue());
        });
        this.c.signals.defaultAssemblyChanged.add(() => {
            if (this.c.parameters.defaultAssembly.length > 0) {
                strucAssemblySelect.setValue(this.c.parameters.defaultAssembly);
            }
        }); // TODO remove signal on dispose

        // Add rows to table
        this.addRow("Title:", structure.title);
        this.addRow("Path:", structure.path);
        this.addRow("Active assembly:", strucAssemblySelect);

        // Set up structural parts table
        const partsCountInfo = new TextArea();
        partsCountInfo.setEditable(false);
        // TODO update this info when there's a change?
        const strucInfo = structure.toString().split("\n");
        strucInfo.forEach(str => {
            partsCountInfo.addRow(str);
        });

        // Add to this element
        this.add(
            new TextElement("Structural parts:"),
            partsCountInfo);
    }
    public get strucName(): string {
        return this.c.structure.name;
    }
    public set strucName(n: string) {
        this.c.structure.name = n;
    }
}
