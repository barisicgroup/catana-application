import WgAlgorithm from "./wg-algorithm";
import WgContext from "../wg-context";
import WgPass from "../wg-pass";

/**
 * A generic algorithm that takes WgPasses in the constructor
 * and executes them in sequence when run() is called
 */
class WgGenericAlgorithm extends WgAlgorithm {

    protected readonly passes: WgPass[];
    private readonly debug?: string;

    public constructor(context: WgContext, passes: WgPass[], debug?: string) {
        super(context);
        this.passes = passes;
        this.debug = debug;
    }

    public async run() {
        await this._run([...this.passes], this.debug);
    }
}

export default WgGenericAlgorithm;