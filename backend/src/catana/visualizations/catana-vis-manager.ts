import VisChain from "./vis-chain";
import DirectionSelector from "./direction-selector";
import GizmosTransform from "./gizmos-transform";
import InteractionPlane from "./interaction-plane";

/**
 * Manages instances of various visualizations components of Catana
 */
export class CatanaVisManager {
    visChain: VisChain;
    dirSel: DirectionSelector;
    gizmoTransform: GizmosTransform;
    interactionPlane: InteractionPlane;

    constructor() {
        this.visChain = new VisChain();
        this.dirSel = new DirectionSelector();
        this.gizmoTransform = new GizmosTransform();
        this.interactionPlane = new InteractionPlane();
    }
}

export default CatanaVisManager;