import Element, {Callback, CallbackType} from "./element";

class FileDropArea extends Element<HTMLDivElement> {

    private readonly changeCallbacks: Callback[] = [];

    private files: null | FileList = null;

    public constructor(text?: string, acceptedExtensions?: string[]) {
        super(document.createElement("div"));
        this.addClass("DropArea");

        // Set up input element
        const input = new Element<HTMLInputElement>(document.createElement("input"));
        input.dom.type = "file";
        input.dom.setAttribute("multiple", "");
        if (acceptedExtensions) input.dom.accept = "." + acceptedExtensions.join(",.");

        // Set up callbacks
        input.addCallback(CallbackType.CHANGE, () => {
                if (input.dom.files!.length > 0) {
                    this.files = input.dom.files;
                    for (const c of this.changeCallbacks) c(CallbackType.CHANGE, this);
                }
            })
            //.addCallback(CallbackType.CLICK, () => {
                //input.dom.click();
            //})
            .addCallback(CallbackType.DRAGENTER, () => {
                this.addClass("active");
            })
            .addCallback(CallbackType.DRAGLEAVE, () => {
                this.removeClass("active");
            })
            .addCallback(CallbackType.DRAGOVER, (type, srcElement, event: DragEvent) => {
                event?.stopPropagation();
                event?.preventDefault();
                if (!event.dataTransfer) console.error("Event dataTransfer was undefined");
                else event.dataTransfer.dropEffect = "copy";
            })
            .addCallback(CallbackType.DROP, (type, srcElement, event: DragEvent) => {
                event.stopPropagation();
                event.preventDefault();
                this.removeClass("active");
                if (!event.dataTransfer) console.error("Event dataTransfer was undefined");
                else if (event.dataTransfer.files.length > 0) {
                    this.files = event.dataTransfer.files;
                    for (const c of this.changeCallbacks) c(CallbackType.CHANGE, this);
                }
            });

        // Set up rest
        this.setText(text || "Click here to browse your files, or drag a file here");
        this.dom.appendChild(input.dom);
    }

    public addCallback(types: CallbackType | CallbackType[], fun: Callback) {
        const rest = FileDropArea.filterOutTypes(types, CallbackType.CHANGE, (t) => {
            this.changeCallbacks.push(fun);
        });
        super.addCallback(rest, fun);
        return this;
    }

    public getFiles(): null | FileList {
        return this.files;
    }

    public setText(text: string) {
        this.dom.textContent = text;
    }

    public getText(): string {
        return this.dom.textContent || "";
    }
}

export default FileDropArea;