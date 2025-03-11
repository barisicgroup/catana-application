import Data from "./data";

import { Stage } from "catana-backend";

import Element from "./elements/element";
import Tooltip from "./elements/tooltip";
import AnimLoader from "./elements/anim-loader";
import { FilteringModalBox } from "./elements/specialized/filtering";
import LayoutManager from "./layout/layout-manager";
import BugModal from "./elements/modal/bug-modal";
import ActionsManager from "./actions-manager";

class Globals {
    static stage: Stage;
    static body: Element;
    static layoutManager: LayoutManager;
    static actionsManager: ActionsManager;
    static animatedLoader: null | AnimLoader;
    static tooltip: null | Tooltip;
    static filteringModalBox: FilteringModalBox;
    static bugReport: BugModal;
    static rollbar: any | undefined; // Reference to bug-reporting Rollbar.com API

    static readonly data: Data<any> = new Data<any>();

    static buildTime: null | string;
}

export default Globals;