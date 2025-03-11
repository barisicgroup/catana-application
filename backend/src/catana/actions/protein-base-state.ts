import CatanaProteinActions from "./catana-protein-actions";
import { CatanaState } from "./catana-state";

/**
 * Base class for Catana actions influencing all-atom (NGL data model) structures.
 */
abstract class ProteinBaseState extends CatanaState {
    protected readonly catanaProteinActions: CatanaProteinActions = new CatanaProteinActions();
    protected prevCursorStyle: string;
}

export default ProteinBaseState;