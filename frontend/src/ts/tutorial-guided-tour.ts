import { Stage, StageLoadFileParams } from "catana-backend";
import { Component } from "catana-backend";
import AnimLoader from "./elements/anim-loader";

class TutorialGuidedTour {
    private static tutorial_script: HTMLScriptElement | undefined = undefined;
    private static tutorial_css: HTMLLinkElement | undefined = undefined;

    public static run(stage: Stage, progressBar: AnimLoader | null) {
        if (TutorialGuidedTour.tutorial_script === undefined) {
            // Source: https://stackoverflow.com/questions/14521108/dynamically-load-js-inside-js
            TutorialGuidedTour.tutorial_script = document.createElement("script") as HTMLScriptElement;
            document.head.appendChild(TutorialGuidedTour.tutorial_script);

            TutorialGuidedTour.tutorial_script!.onload = () => {
                TutorialGuidedTour.tutorial_css = document.createElement("link") as HTMLLinkElement;
                document.head.appendChild(TutorialGuidedTour.tutorial_css);

                TutorialGuidedTour.tutorial_css.rel = "stylesheet";

                TutorialGuidedTour.tutorial_css!.onload = () => {
                    // Now finally start the tour!
                    const introJs = (window as any).introJs;

                    //const tour = new TutorialGuidedTour(script, introJs);
                    const tour = new TutorialGuidedTour(introJs);
                    tour._run(stage, progressBar);
                }

                TutorialGuidedTour.tutorial_css.href = "https://unpkg.com/intro.js/minified/introjs.min.css";
            };

            TutorialGuidedTour.tutorial_script.src = "https://unpkg.com/intro.js/minified/intro.min.js";

        } else {
            const introJs = (window as any).introJs;
            const tour = new TutorialGuidedTour(introJs);
            tour._run(stage, progressBar);
        }
    }

    //private script: HTMLScriptElement;
    private introJs: (() => any);

    //private constructor(script: HTMLScriptElement, introJs: () => any) {
    private constructor(introJs: () => any) {
        //this.script = script;
        this.introJs = introJs;
    }

    private _run(stage: Stage, progressBar: AnimLoader | null): Promise<void> {
        stage.removeAllComponents();
        progressBar?.show();
        return Promise.all([
            stage.loadFile("catana://example_files/full_tal.pdb", {
                defaultRepresentation: true
            }),
            stage.loadFile("catana://example_files/six_hextubes.json", {
                defaultRepresentation: true,
                latticeType: "honeycomb"
            } as unknown as StageLoadFileParams)
        ]).then((comps) => {
            progressBar?.hide();
            stage.autoView();
            this._runSteps(stage, comps);
        });
    }

    private _runSteps(stage: Stage, comps: Component[][]) {
        const intro = this.introJs();
        intro.setOption("overlayOpacity", 0.6);
        const components: Component[] = ([] as Component[]).concat(...comps);
        const componentsStartStep = 9;

        let componentOptions: { title: string; intro: string }[] = [];

        for (let i = 0; i < components.length; ++i) {
            let textType = "general component."; // just a fallback default value

            if (components[i].type === "structure") {
                textType = "fully atomistic structure loaded from PDB.";
            } else if (components[i].type === "cg-structure") {
                textType = "coarse-grained nanostructure loaded from cadnano's JSON file.";
            } else if (components[i].type === "lattice") {
                textType = "DNA origami lattice created from the data stored in cadnano's JSON file.";
            }

            componentOptions.push({
                title: "#" + (i + 1) + ": " + components[i].name,
                intro: components[i].name + " is a " + textType
            });
        }

        intro.setOptions({
            tooltipClass: "IntroJsTooltip",
            steps: [{
                title: "User Interface Tour",
                intro: "Dear user, welcome to the guided tour which will introduce you to the Catana user interface. <BR>Let's start!"
            },
            {
                title: "Scene",
                intro: "As you may have noticed, new structures were loaded in the background and added to the scene. Scene is the core part of the Catana where all the magic happens."
            },
            {
                element: document.querySelector("#topBar"),
                title: "Header bar",
                intro: "The main purpose of the header bar is to allow you to import and export structures using variety of file formats. " +
                    "Apart from that, you can start structure prediction tasks, create simple structures from scratch, modify settings of the scene or simply just start this guided tour again whenever you need it."
            },
            {
                element: document.querySelector("#layoutsDropdown"),
                title: "Layouts",
                intro: "Furthermore, you can use the Layouts menu to swap between different user interface layouts, helping you to focus on the task at hand."
            },
            {
                element: document.querySelector("#topBar .End"),
                title: "Gizmos panel",
                intro: "The gizmos panel at the top right allows for showing or hiding of translation and rotation gizmos. Moreover, you can also change the behavior of these gizmos."
            },
            {
                element: document.querySelector("#rightBar"),
                title: "Right bar",
                intro: "The right bar consists of Workspace and Inspector panels. The Workspace shows the list of components, i.e., structures loaded into the scene. If you click on a component, Inspector will show details of this component."
            },
            {
                element: document.querySelector("#rightBar .Panel .ComponentsTreeView"),
                title: "Component",
                intro: "There are three main types of components in Catana.<BR> First type represents fully atomistic structures, the second represents coarse-grained structures, and the last one corresponds to the DNA origami lattices."
            },
            {
                element: document.querySelector("#rightBar .Panel .ComponentsTreeView .TreeViewContent .TreeViewNode"),
                title: "Component",
                intro: "For each component, the Workspace panel shows icon representing the component type followed by the component name and buttons to quickly perform certain operations."
            },
            {
                element: document.querySelector("#rightBar .ComponentPanel .CollapsiblePanelBar"),
                title: "Loaded Components",
                intro: "There are currently " + components.length + " loaded components, while only two of them are visible, as you can notice in the Workspace."
            },
            ...componentOptions,
            {
                element: document.querySelector("#leftBar"),
                title: "Left bar",
                intro: "In the left bar, you can find controls allowing you to modify the loaded structures. <BR> The content of this bar also depends on the chosen layout."
            },
            {
                element: document.querySelector("#leftBar"),
                title: "Left bar",
                intro: "Notice the icon at the top of the bar. It tells you what type of component/structure can be modified by these operations."
            },
            {
                element: document.querySelector("#bottomBar"),
                title: "Bottom bar",
                intro: "Bottom bar shows the currently used version of Catana. Especially important for bug reporting."
            },
            {
                element: document.querySelector("#bottomBar .End"),
                title: "Scene operations",
                intro: "Furthermore, the right part of the bottom bar contains buttons allowing to quickly perform selected scene-related operations, such as toggling the visualization of a origin axes."
            },
            {
                title: "The End",
                intro: "That's it. We hope you will find Catana software useful!<BR> If you ever needed, you can run this tour again from Help -> User Interface Tour."
            },
            ]
        });

        intro.onbeforechange(function (this: any) {
            if (this._currentStep >= componentsStartStep && this._currentStep < componentsStartStep + components.length) {
                for (let i = 0; i < components.length; ++i) {
                    components[i].setVisibility(i === this._currentStep - componentsStartStep);
                }
            }

            return true;
        });

        intro.start();
    }
}

export default TutorialGuidedTour;