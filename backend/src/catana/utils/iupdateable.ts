/**
 * Interface for objects having/requring a realtime update features
 */
interface IUpdateable {
    /**
     * This function is called every frame (typically by the Stage class).
     * It is intentionally named "event-like" to make it clear it is primarily listener
     * to some "update" and not performing update of internal component data.
     * @param deltaTime time passed since last call of this function
    */
    onUpdate(deltaTime: number): void;
}

export default IUpdateable;