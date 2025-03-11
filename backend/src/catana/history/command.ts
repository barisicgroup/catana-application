export abstract class Command {
    // Abstract methods
    public abstract do(): void;
    public abstract undo(): void;

    // Abstract getters
    public abstract get name(): string;

    // Implementations --------------------------------------------------

    public prev: Command | null;

    constructor(c?: Command) {
        this.prev = c ? c : null;
    }

    protected error_cannotRedo(): void {
        console.error("This action cannot be redone if it hasn't been undone. Action: " + this.name);
    }

    protected error_cannotUndo(): void {
        console.error("This action cannot be undone if it hasn't be done. Action: " + this.name);
    }
}

export default Command;