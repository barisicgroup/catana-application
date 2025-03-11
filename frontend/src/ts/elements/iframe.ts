import Element from "./element";

class Iframe extends Element<HTMLIFrameElement>
{
    public constructor(url: string, title: string, name?: string) {
        super(document.createElement("iframe"));

        this.dom.setAttribute("src", url);
        this.dom.setAttribute("title", title);
        if (name) {
            this.dom.setAttribute("name", name);
        }
    }
}

export default Iframe;