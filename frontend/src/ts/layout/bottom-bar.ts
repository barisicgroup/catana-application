import Panel, { PanelOrientation } from "../elements/panel";
import ImageElement from "../elements/image-element";
import Globals from "../globals";
import CATANA from "../catana-instance";
import TextElement, { TextPart } from "../elements/text-element";
import MainPanel from "./main-panel";
import { IconButton, IconType } from "../elements/icon";
import { ButtonType } from "../elements/button";
import { CallbackType } from "../elements/element";
import Separator from "../elements/separator";

class BottomBar extends MainPanel {

    private readonly description: TextElement

    public constructor() {
        super(PanelOrientation.HORIZONTAL);

        // Left (Start)
        {
            const logoPanel = new Panel(PanelOrientation.HORIZONTAL); {
                const appIcon = new ImageElement("./favicon.ico");
                logoPanel.setId("logo");
                logoPanel.add(appIcon);

                const infoTextDefault = "Catana, version " + CATANA.Version + " [%BUILD_TIME%]";
                let versionText = new TextElement(infoTextDefault);
                logoPanel.add(versionText);

                fetch("dist/build_time.txt").then((response) => {
                    if (response.status >= 200 && response.status <= 299) {
                        return response.text();
                    } else {
                        throw Error(response.statusText);
                    }
                }).then((textResponse) => {
                    Globals.buildTime = textResponse;
                    let defaultText = versionText.getValue() as string;
                    versionText.setText(defaultText.replace("%BUILD_TIME%", textResponse));
                }).catch((error) => console.log(error));
            }
            const actionDescriptionPanel = new Panel(PanelOrientation.HORIZONTAL); {
                this.description = new TextElement();
                actionDescriptionPanel.add(this.description);
            }
            this.start.add(logoPanel, new Separator(), actionDescriptionPanel);
        }

        // Right (End)
        {
            // Bottom bar icons
            const toggleGridBtn = new IconButton(IconType.GRID, undefined, ButtonType.MINI);
            toggleGridBtn.setTitle("Toggle grid visualization");
            toggleGridBtn.addCallback(CallbackType.CLICK, () => {
                Globals.stage.viewer.gridHelperVisible = !Globals.stage.viewer.gridHelperVisible;
                Globals.stage.viewer.requestRender();
            });

            const toggleOrigAxisBtn = new IconButton(IconType.AXES, undefined, ButtonType.MINI);
            toggleOrigAxisBtn.setTitle("Toggle scene origin visualization");
            toggleOrigAxisBtn.addCallback(CallbackType.CLICK, () => {
                Globals.stage.viewer.originMarkerVisible = !Globals.stage.viewer.originMarkerVisible;
                Globals.stage.viewer.requestRender();
            });

            const bringToFocusBtn = new IconButton(IconType.SCENE_TO_FOCUS, undefined, ButtonType.MINI);
            bringToFocusBtn.setTitle("Bring scene to focus");
            bringToFocusBtn.addCallback(CallbackType.CLICK, () => Globals.stage.autoView(500));

            this.end.add(toggleGridBtn, toggleOrigAxisBtn, bringToFocusBtn);
        }
    }

    public static getHeight(): number {
        return MainPanel.NARROW;
    }

    public setDimensionsRem(dim: { height: number, right: number }) {
        this.getStyle().height = dim.height + "rem";
        this.getStyle().right = dim.right + "rem";
        this.setVisible(!!dim.height);
    }

    public clearDescriptionText() {
        this.description.clear();
    }

    public setDescriptionText(text: string | TextPart[]) {
        this.description.setText(text);
        this.description.setTitle(this.description.getText());
    }
}

export default BottomBar;