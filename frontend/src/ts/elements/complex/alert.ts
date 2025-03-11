import MovableModalBox from "../modal/movable-modal-box";

class Alert extends MovableModalBox {
    public constructor(title: string) {
        super(title, false);
        const scope = this;
        this.addClass("Alert");
        this.addOnCloseCallback(() => scope.dispose());
    }
}

export default Alert;