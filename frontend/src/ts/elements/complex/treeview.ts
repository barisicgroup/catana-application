import Element from "../element";
import CollapsiblePanel from "./collapsible-panel";

class TreeViewNode<OBJ, ELEM extends Element> extends CollapsiblePanel<ELEM> {

    private readonly _object: OBJ;

    public constructor(object: OBJ, element: ELEM, collapsed: boolean = true) {
        super(element);
        this.addClass("TreeViewNode");
        this.addClass("nochildren"); // TODO implement this dynamically
        this.setCollapsed(collapsed);
        this._object = object;
    }

    public get object(): OBJ {
        return this._object;
    }
}

type Object2ElemFun<OBJ, ELEM> = (obj: OBJ) => ELEM;

class TreeView<OBJ, ELEM extends Element> extends Element<HTMLDivElement> {

    private readonly content: HTMLDivElement;
    private readonly rootNodes: TreeViewNode<OBJ, ELEM>[] = [];
    private readonly obj2elemFun: Object2ElemFun<OBJ, ELEM>;

    public constructor(obj2elemFun: (object: OBJ) => ELEM) {
        super(document.createElement("div"));

        this.content = document.createElement("div");
        this.content.classList.add("TreeViewContent");
        this.dom.appendChild(this.content);

        this.addClass("TreeView");
        this.obj2elemFun = obj2elemFun;
    }

    public addNode(object: OBJ): TreeViewNode<OBJ, ELEM> {
        const element = this.obj2elemFun(object);
        const node = new TreeViewNode<OBJ, ELEM>(object, element);
        this.rootNodes.push(node);
        this.content.appendChild(node.dom);
        return node;
    }

    private getNodeIndex(object: OBJ): number {
        for (let i = 0; i < this.rootNodes.length; ++i) {
            const node = this.rootNodes[i];
            if (object === node.object) return i;
        }
        return -1;
    }

    public getNode(object: OBJ): null | TreeViewNode<OBJ, ELEM> {
        const index = this.getNodeIndex(object);
        if (index !== -1) return this.rootNodes[index];
        return null;
    }

    public removeNode(object: OBJ) {
        const index = this.getNodeIndex(object);
        if (index !== -1) {
            this.rootNodes[index].dispose();
            this.rootNodes.splice(index, 1);
        }
        return this;
    }
}

export default TreeView;