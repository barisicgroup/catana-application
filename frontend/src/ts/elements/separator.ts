import Element from "./element";
 
class Separator extends Element<HTMLDivElement> {
    public constructor() {
        super(document.createElement("div"));
        this.addClass("Separator");
    }
}

export default Separator;