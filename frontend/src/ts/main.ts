import { Log, Stage } from "catana-backend";
import LocalStorage from "./local-storage";
import Globals from "./globals";
import AnimLoader from "./elements/anim-loader";
import TextElement from "./elements/text-element";
import CATANA from "./catana-instance";
import Tooltip from "./elements/tooltip";
import { FilteringModalBox } from "./elements/specialized/filtering";
import TutorialGuidedTour from "./tutorial-guided-tour";
import { setStylesheetColors } from "./color";
import LayoutManager from "./layout/layout-manager";
import Element from "./elements/element";
import Dialog from "./elements/complex/dialog";
import Icon, { IconType } from "./elements/icon";
import BugModal from "./elements/modal/bug-modal";
import ActionsManager from "./actions-manager";
import { setLastSessionPlugins } from "./util";

const localStorage_firstTimeVisit = new LocalStorage<boolean>("StorageKey_FirstTimeVisit");

function initProgressBar() {
  Globals.animatedLoader = new AnimLoader();
  Globals.animatedLoader.setId("globalAnimLoader");
  document.body.appendChild(Globals.animatedLoader.dom);
  Globals.animatedLoader.hide();
}

function initLogAlerts() {
  const logAlertText = new TextElement().setId("logAlertText").setVisible(false);
  document.body.appendChild(logAlertText.dom);

  CATANA.Log.eventListeners.push((type, ...argArray) => {
    if (type !== "log") {
      logAlertText.dom.classList.remove("ErrorAlertText", "WarningAlertText");

      if (type === "error") {
        logAlertText.addClass("ErrorAlertText");
      } else if (type === "warn") {
        logAlertText.addClass("WarningAlertText");
      }

      logAlertText.setText("[" + type + "] " + argArray.join());
      logAlertText.setVisible(true);
      setTimeout(() => {
        logAlertText.setVisible(false);
      }, 1500);
    }
  });
}

function initTooltip() {
  const tt = new Tooltip().setId("globalTooltip").setVisible(false);
  document.body.appendChild(tt.dom);
  Globals.tooltip = tt;
}

function initFilteringModalBox(stage) {
  const fmb = new FilteringModalBox(stage, IconType.FILTER).setId("filteringModal");
  document.body.appendChild(fmb.dom);
  Globals.filteringModalBox = fmb;
}

function initConnectionStatusListeners(): void {
  window.addEventListener("offline", (e) => {
    Log.warn("You seem to be offline.");
  });

  window.addEventListener("online", (e) => {
    Log.info("You are back online.");
  });
}

function onBeforeUnload(): void {
  const plugins = Globals.stage.pluginManager.loadedPlugins;
  setLastSessionPlugins(plugins.map(x => x.name));
}

export function init(stage: Stage, rollbar: object | undefined) {
  setStylesheetColors();

  Globals.stage = stage;
  Globals.rollbar = rollbar;
  Globals.body = new Element(document.body);
  Globals.actionsManager = new ActionsManager();
  Globals.layoutManager = new LayoutManager(Globals.body);
  Globals.bugReport = new BugModal();

  initProgressBar();
  initLogAlerts();
  initTooltip();
  initFilteringModalBox(stage);
  initConnectionStatusListeners();

  // Finish viewport setup
  if (stage.viewer.renderer) {
    stage.viewer.renderer.domElement.focus();
  }
  stage.handleResize();
  window.addEventListener(
    'resize', function (event) {
      stage.handleResize();
    }, false
  );

  stage.catanaVisManager.dirSel.circle.update();

  // Tutorial setup
  if (localStorage_firstTimeVisit.get(true)) {
    localStorage_firstTimeVisit.set(false);

    const dialog = new Dialog("Welcome dear user!", "Yes, start the guided tour");
    dialog.add(
      new TextElement("It seems that you are using Catana for the first time!"),
      new TextElement("Would you like to start a guided tour through the user interface?"));
    dialog.show().wait().then(confirmed => {
      if (confirmed) {
        TutorialGuidedTour.run(stage, Globals.animatedLoader);
      }
    });
  }

  // Developer message
  const messagePath = "THIS_WAS_REMOVED";  // NOTE: THIS URL WAS REMOVED FROM THE PUBLIC SOURCE CODE
  const noDevMessageCallback = () => console.log("There is no message from developers.");

  fetch(messagePath, { cache: "no-store" })
    .then(
      val => val.ok ? val.text() : "",
      noDevMessageCallback
    )
    .then(
      (text: string) => {
        const t = text.trim();
        if (t.length > 0) {
          const devMsgDialog = new Dialog("Developer message");
          devMsgDialog.add(
            new Icon(IconType.INFO),
            new TextElement(t)
          );
          devMsgDialog.show().wait();
        } else {
          noDevMessageCallback();
        }
      },
      noDevMessageCallback
    ).catch(
      noDevMessageCallback
    );

  // Check for "leaving Catana"
  window.addEventListener("beforeunload", onBeforeUnload);
}