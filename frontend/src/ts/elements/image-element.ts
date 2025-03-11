import Element from "./element";

class ImageElement extends Element<HTMLImageElement> {
    public constructor(imageSrc: string, width?: number, height?: number) {
        super(document.createElement("img"));
        if (width !== undefined) this.dom.width = width;
        if (height !== undefined) this.dom.height = height;
        this.dom.className = "Image";
        this.dom.src = imageSrc;
    }
}

export default ImageElement;