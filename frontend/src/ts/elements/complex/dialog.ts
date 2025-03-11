import MovableModalBox from "../modal/movable-modal-box";
import Element, {CallbackType} from "../element";
import Panel from "../panel";
import Button from "../button";

class Dialog extends MovableModalBox {

    private waiting: boolean = false;

    private readonly confirmCallbacks: (() => void)[] = [];
    private readonly dialogContent: Panel;

    public constructor(title: string, confirmText: string = "Ok") {
        super(title, false);
        const scope = this;
        this.addClass("Dialog");
        this.dialogContent = new Panel().addClass("DialogContent");
        const bottomBar = new Panel().addClass("DialogBottomBar");
        bottomBar.add(new Button(confirmText).addCallback(CallbackType.CLICK, () => {
            for (const c of scope.confirmCallbacks) c();
        }));
        super.add(this.dialogContent);
        super.add(bottomBar);
    }

    public add(...e: Element<any>[]) {
        this.dialogContent.add(...e);
        return this;
    }

    public addOnConfirmCallback(fun: () => void) {
        this.confirmCallbacks.push(fun);
        return this;
    }

    public wait(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (this.waiting) {
                reject("Attempted to wait for a Dialog that is already being waited for");
                return;
            }
            this.waiting = true;

            const _finish = (confirmed: boolean) => {
                const callbacks = confirmed ? this.confirmCallbacks : this.closeCallbacks;
                this.confirmCallbacks.splice(this.confirmCallbacks.indexOf(confirm), 1);
                this.closeCallbacks.splice(this.closeCallbacks.indexOf(close), 1);
                for (const c of callbacks) c();
                resolve(confirmed);
                this.waiting = false;
                this.dispose();
            }
            const confirm = () => _finish(true);
            const close = () => _finish(false);
            this.addOnConfirmCallback(confirm);
            this.addOnCloseCallback(close);
        });
    }
}

export default Dialog;