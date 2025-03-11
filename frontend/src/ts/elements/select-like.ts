import Element from "./element";
import Icon, {IconType} from "./icon";

/**
 * Looks like a select but behaves differently
 */
class SelectLike<V> extends Element<HTMLSpanElement> {

    protected createHeaderFun: (v: V) => Element;

    private value: V;
    protected header: Element;

    public constructor(initialValue: V, createHeaderFun: (v: V) => Element) {
        super(document.createElement("span"));
        this.dom.className = "Select CustomSelect";

        this.createHeaderFun = createHeaderFun;
        this.header = new Element(document.createElement("span"));

        this.dom.appendChild(this.header.dom);
        this.dom.appendChild(new Icon(IconType.SELECT_ARROW).addClass("CustomSelectIcon").dom);

        this.setValue(initialValue);
    }

    public setValue(v: V) {
        this.value = v;
        const newHeader = this.createHeaderFun(v).addClass("CustomSelectSelected");
        this.header.appendBefore(newHeader);
        this.header.dispose();
        this.header = newHeader;
    }

    public getValue(): V {
        return this.value;
    }
}

export default SelectLike;