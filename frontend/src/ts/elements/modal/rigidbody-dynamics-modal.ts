import { RigidBodySimulator, ClusterAlgorithms, LineChart, StructureAnalysis, Log, StructureCluster } from "catana-backend";
import Globals from "../../globals";
import Button from "../button";
import InputPanel from "../complex/input-panel";
import TitledPanel from "../complex/titled-panel";
import { CallbackType } from "../element";
import { IconButton, IconToggle, IconType } from "../icon";
import Input from "../input";
import Panel, { PanelOrientation } from "../panel";
import Select from "../select";
import { ToggleState } from "../toggle";
import MovableModalBox from "./movable-modal-box";

class RigidBodyDynamicsModal extends MovableModalBox {
    private _forcesChartData: [number, number][] = [[0, 0]];
    private _forcesChart: LineChart;

    public constructor() {
        super("Rigid body dynamics", false, IconType.RIGIDBODY_DYNAMICS);

        const clusteringPanel = new TitledPanel("Clustering settings", PanelOrientation.VERTICAL);

        const dbScanClustType = "DBSCAN clustering";
        const filterClustType = "Filter-based clustering";
        const clusterTypeSelect = new Select([dbScanClustType, filterClustType], false);

        const neighbourRadius = new Input("18", "number");
        const neighbourRadiusPanel = new InputPanel("DBSCAN neighbour radius: ", neighbourRadius);

        const minPoints = new Input("3", "number");
        const minPointsPanel = new InputPanel("DBSCAN minimum points: ", minPoints);

        let clusterFilterInputs: Input[] = [];

       const addClusterFilterButton = new Button("Add new cluster defined by a filter");

        const defFiltInput = new Input(undefined, undefined, "Input filter string");
        clusterFilterInputs.push(defFiltInput);

        addClusterFilterButton.addCallback(CallbackType.CLICK, () => {
            const ni = new Input(undefined, undefined, "Input filter string");
            clusterFilterInputs.push(ni);
            clusteringPanel.add(ni);
        })

        const updateClustersUI = () => {
            neighbourRadiusPanel.setVisible(clusterTypeSelect.getValue() === dbScanClustType);
            minPointsPanel.setVisible(clusterTypeSelect.getValue() === dbScanClustType);
            addClusterFilterButton.setVisible(clusterTypeSelect.getValue() !== dbScanClustType);
            clusterFilterInputs.forEach(x => x.setVisible(clusterTypeSelect.getValue() !== dbScanClustType));
        };

        updateClustersUI();
        clusterTypeSelect.addCallback(CallbackType.CHANGE, updateClustersUI);
        clusteringPanel.add(clusterTypeSelect, neighbourRadiusPanel, minPointsPanel, addClusterFilterButton, defFiltInput);

        const physicsSettingsPanel = new TitledPanel("Rigid body physics settings", PanelOrientation.VERTICAL);

        const relaxedSpringLength = new Input("3.32", "number");
        const relaxedSpringLengthPanel = new InputPanel("Relaxed spring length: ", relaxedSpringLength);

        const springConstant = new Input("10", "number");
        const springConstantPanel = new InputPanel("Spring constant: ", springConstant);

        const timeStepInput = new Input("0.1", "number");
        timeStepInput.setTitle("Use value <= 0 for rendering-matching time step, or > 0 for fixed one.");
        const timeStepInputPanel = new InputPanel("Physics time step:", timeStepInput);

        physicsSettingsPanel.add(timeStepInputPanel, relaxedSpringLengthPanel, springConstantPanel);

        const startStopToggle = new IconToggle(ToggleState.OFF, IconType.STOP, IconType.PLAY, "Stop rigid body simulation", "Start rigid body simulation");
        const continuePauseToggle = new IconToggle(ToggleState.OFF, IconType.PAUSE, IconType.PLAY, "Pause rigid body simulation", "Continue rigid body simulation");
        continuePauseToggle.setEnabled(false);

        const explodeButton = new IconButton(IconType.EXPLODE, "Make explosion at center of mass");
        explodeButton.setEnabled(false);

        const chartsPanel = new Panel();
        this._forcesChart = new LineChart(this._forcesChartData, this.forcesChartParams);
        chartsPanel.dom.appendChild(this._forcesChart.node);

        this.rbSimulator.signals.simulationStepExecuted.add((totalForce: number) => {
            this._forcesChartData.push([this._forcesChartData.length, totalForce]);
            this.updateForcesChart();
        });

        startStopToggle.addCallback(CallbackType.CLICK, () => {
            if (startStopToggle.isOn()) {
                continuePauseToggle.setEnabled(true);
                explodeButton.setEnabled(true);
                continuePauseToggle.setState(ToggleState.ON, true);

                ClusterAlgorithms.prepareComponents(Globals.stage.compList);

                let clusters: StructureCluster[];

                if (clusterTypeSelect.getValue() === dbScanClustType) {
                    clusters = ClusterAlgorithms.createDbscanClusters(
                        Globals.stage.compList,
                        Number.parseFloat(neighbourRadius.getValue()),
                        Number.parseInt(minPoints.getValue())
                    );
                } else {
                    clusters = ClusterAlgorithms.createFilterClusters(
                        Globals.stage.compList,
                        clusterFilterInputs.map(x => x.getValue().trim()).filter(x => x.length > 0)
                    );
                }

                const joints = ClusterAlgorithms.computeInterclusterJoints(clusters,
                    Number.parseFloat(relaxedSpringLength.getValue()),
                    Number.parseFloat(springConstant.getValue())
                );

                // Intentionally initialized to [0,0] since the chart needs at least some data.
                // Further, this value makes sense from the perspective of the chart.
                this._forcesChartData = [[0, 0]];

                Log.info("Created " + clusters.length + " cluster(s).");

                this.rbSimulator.timeStep = Number.parseFloat(timeStepInput.getValue());
                this.rbSimulator.start(clusters, joints);
            } else {
                this.rbSimulator.stop();
                continuePauseToggle.setEnabled(false);
                explodeButton.setEnabled(false);
            }
        });

        continuePauseToggle.addCallback(CallbackType.CLICK, () => {
            if (continuePauseToggle.isOn()) {
                this.rbSimulator.continue();
                explodeButton.setEnabled(true);
            } else {
                this.rbSimulator.pause();
                explodeButton.setEnabled(false);
            }
        });

        explodeButton.addCallback(CallbackType.CLICK, () => {
            this.rbSimulator.applyExplosionAtCenterOfMass(1000);
        });

        this.add(clusteringPanel, physicsSettingsPanel, startStopToggle, continuePauseToggle, explodeButton, chartsPanel);
    }

    private get rbSimulator(): RigidBodySimulator {
        return Globals.stage.rigidbodySimulator;
    }

    private get forcesChartParams(): any {
        return {
            x: (d: any) => d[0],
            y: (d: any) => d[1],
            yLabel: "Total force in the system",
            color: StructureAnalysis.defaultChartColor
        };
    }

    private updateForcesChart(): void {
        this._forcesChart.updateChart(this._forcesChartData);
    }
}

export default RigidBodyDynamicsModal;