import Element from "./element";

class List extends Element<HTMLUListElement> {
    public constructor(...elements: (Element | string)[]) {
        super(document.createElement("ul"));
        this.addClass("List");
        this.add(...elements);
    }

    public add(...elements: (Element | string)[]) {
        for (let e of elements) {
            if (e instanceof List) {
                this.dom.appendChild(e.dom);
            } else {
                const li = new Element<HTMLLIElement>(document.createElement("li"))
                    .addClass("ListLine");
                if (typeof e === "string") li.dom.textContent = e;
                else li.dom.appendChild(e.dom);
                this.dom.appendChild(li.dom);
            }
        }
        return this;
    }
}

export default List;