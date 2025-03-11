import MovableModalBox from "./movable-modal-box";
import { IconButton, IconToggle, IconType } from "../icon";
import { ComponentsSelect } from "../specialized/component/component";
import { autoLoad, download, duplicateComponentContainingStructure, Frames, Log, TrajectoryElement, TrajectoryPlayer } from "catana-backend";
import Button from "../button";
import { flatten, ParserRegistry, StructureComponent } from "catana-backend";
import Element, { CallbackType } from "../element";
import { SimpleFormTable } from "../complex/table";
import TextElement, { TextType } from "../text-element";
import Panel, { PanelOrientation } from "../panel";
import Slider from "../slider";
import { ToggleState } from "../toggle";
import Select from "../select";
import Globals from "../../globals";

const AVAILABLE_EXTENSIONS = flatten([
    ParserRegistry.getTrajectoryExtensions()
], []);

/**
 * Modal box enabling to play MD trajectories.
 */
class ViewTrajectoryModal extends MovableModalBox {
    private _selStructureComp: StructureComponent | undefined;
    private _trajectoryComponent: TrajectoryElement;
    private _trajectoryControls: TrajectoryControls;
    private _trajectoryPlayer: TrajectoryPlayer;

    public constructor(icon?: IconType) {
        super("View Trajectory", false, icon);

        const table = new SimpleFormTable();

        const componentSelect = new ComponentsSelect(["structure"], undefined, false);
        const fileInput = this.getFileInput();
        const viewButton = new Button("Load trajectory");
        this._trajectoryControls = new TrajectoryControls();
        this._trajectoryControls?.setVisible(false);

        table.addRow([new TextElement("Trajectory structure"), componentSelect]);
        table.addRow([new TextElement("Trajectory file"), fileInput]);

        viewButton.addCallback(CallbackType.CLICK, () => {
            this.removeLoadedTrajectory();
            const selComps = componentSelect.getComponents();
            if (selComps.length > 0) {
                this._selStructureComp = selComps[0] as StructureComponent;
                const trajFiles = fileInput.dom.files;
                if (trajFiles && trajFiles.length > 0) {
                    const trajFile = trajFiles.item(0);
                    if (trajFile) {
                        autoLoad(trajFile).then(frames => {
                            this.addLoadedTrajectory(frames as any);
                        });
                    } else {
                        Log.error("Trajectory file not selected or invalid.");
                    }
                } else {
                    Log.error("You must select a trajectory file!");
                }
            } else {
                Log.error("You must select a component!");
            }
        });

        this.add(table, viewButton, this._trajectoryControls);
    }

    public hide() {
        super.hide();
        this.removeLoadedTrajectory();
        return this;
    }

    private removeLoadedTrajectory(): void {
        if (this._trajectoryComponent) {
            this._trajectoryComponent.setFrame(-1); // Reset position of atoms to initial design state
            this._selStructureComp?.removeTrajectory(this._trajectoryComponent);
        }

        this._trajectoryControls?.setVisible(false);
    }

    private getFileInput(): Element<HTMLInputElement> {
        const input = new Element<HTMLInputElement>(document.createElement("input"));
        input.dom.type = "file";
        input.dom.accept = "." + AVAILABLE_EXTENSIONS.join(",.");
        return input;
    }

    private addLoadedTrajectory(frames: Frames): void {
        this._trajectoryComponent = this._selStructureComp!.addTrajectory(frames);
        Log.info(`Loaded ${this._trajectoryComponent.trajectory.frameCount} trajectory frames for ${this._selStructureComp!.name}`);

        this._trajectoryPlayer = new TrajectoryPlayer(this._trajectoryComponent.trajectory, {
            mode: "once"
        });
        this._trajectoryComponent.trajectory.setPlayer(this._trajectoryPlayer);

        this._trajectoryControls.update(this._trajectoryPlayer, this._selStructureComp!);
        this._trajectoryControls?.setVisible(true);
    }
}

/**
 * Movie player-like controls panel enabling to control the trajectory playback
 */
class TrajectoryControls extends Panel {
    private _title: TextElement;
    private _statusTextPanel: Panel;
    private _statusText: TextElement;
    private _recordingBtnsPanel: Panel;
    private _actionBtnsPanel: Panel;
    private _progressSlider: Slider;

    private _playPauseToggle: IconToggle;
    private _stopButton: IconButton;
    private _nextFrameButton: IconButton;
    private _prevFrameButton: IconButton;
    private _speedSelect: Select;

    private _createStrucFromFrameButton: Button;
    private _downloadFrameScreenshot: Button;

    private _currPlayer: TrajectoryPlayer;
    private _strucComp: StructureComponent;

    public constructor() {
        super(PanelOrientation.VERTICAL);

        this._title = new TextElement("Playback controls", TextType.TITLE);
        this._statusTextPanel = new Panel();
        this._recordingBtnsPanel = new Panel();
        this._actionBtnsPanel = new Panel();
        this._progressSlider = new Slider(0);

        // Main controls buttons and labels

        this._statusText = new TextElement("0/0");
        this._playPauseToggle = new IconToggle(ToggleState.OFF, IconType.PAUSE, IconType.PLAY);
        this._stopButton = new IconButton(IconType.STOP);
        this._nextFrameButton = new IconButton(IconType.ARROW_RIGHT);
        this._prevFrameButton = new IconButton(IconType.ARROW_LEFT);
        this._speedSelect = new Select(["slow", "medium", "fast"], false);

        this._progressSlider.addCallback(CallbackType.INPUT, this.onFrameSliderChange.bind(this));
        this._playPauseToggle.addCallback(CallbackType.CHANGE, this.onPlayPauseButtonClick.bind(this));
        this._stopButton.addCallback(CallbackType.CLICK, this.onStopButtonClick.bind(this));
        this._nextFrameButton.addCallback(CallbackType.CLICK, () => (this.onChangeFrameButtonClick.bind(this))(1));
        this._prevFrameButton.addCallback(CallbackType.CLICK, () => (this.onChangeFrameButtonClick.bind(this))(-1));

        this._speedSelect.setSelectedIndex(1);
        this._speedSelect.addCallback(CallbackType.CHANGE, this.updatePlaybackSpeed.bind(this));

        // Action buttons panel

        this._createStrucFromFrameButton = new Button("New structure from current frame");
        this._downloadFrameScreenshot = new Button("Capture screenshot");

        this._createStrucFromFrameButton.addCallback(CallbackType.CLICK, this.onCreateStrucFromFrame.bind(this));
        this._downloadFrameScreenshot.addCallback(CallbackType.CLICK, this.onDownloadScreenshot.bind(this));

        this._statusTextPanel.addClass("CenteredContent");
        this._statusTextPanel.add(
            this._statusText
        );

        this._recordingBtnsPanel.addClass("CenteredContent");
        this._recordingBtnsPanel.add(
            this._prevFrameButton, this._playPauseToggle, this._speedSelect,
            this._stopButton, this._nextFrameButton
        );

        this._actionBtnsPanel.addClass("CenteredContent");
        this._actionBtnsPanel.add(
            this._createStrucFromFrameButton,
            this._downloadFrameScreenshot
        );

        this.add(
            this._title,
            this._statusTextPanel,
            this._progressSlider,
            this._recordingBtnsPanel,
            this._actionBtnsPanel
        );
    }

    public update(player: TrajectoryPlayer, strucComp: StructureComponent): void {
        this._currPlayer = player;
        this._strucComp = strucComp;

        player.signals.startedRunning.add(() => {
            this._playPauseToggle.setState(ToggleState.ON, true);
        });

        player.signals.haltedRunning.add(() => {
            this._playPauseToggle.setState(ToggleState.OFF, true);
        });

        this._progressSlider.setMax(player.traj.frameCount - 1);
        this._progressSlider.setStep(player.parameters.step);

        player.traj.signals.frameChanged.add(idx => (this.onFrameChange.bind(this))(idx));
        this.onFrameChange(this._currPlayer.parameters.start);
        this.updatePlaybackSpeed();
    }

    private onFrameChange(idx: number): void {
        const fc = this._currPlayer.traj.frameCount - 1;
        const ct = this._currPlayer.traj.getFrameTime(idx);
        const tt = this._currPlayer.traj.getFrameTime(fc);

        if (idx !== undefined && idx >= 0) {
            this._statusText.setText(
                `frame ${idx + 1} / ${fc + 1} (time ${ct / 1000} / ${tt / 1000} ns)`
            );

            this._progressSlider.setValue(idx);
        }
    }

    private onPlayPauseButtonClick(): void {
        if (this._playPauseToggle.isOn()) {
            this._currPlayer?.play();
        } else {
            this._currPlayer?.pause();
        }
    }

    private onStopButtonClick(): void {
        this._currPlayer?.stop();
    }

    private onChangeFrameButtonClick(offset: number): void {
        const currFrame = this._currPlayer?.traj.currentFrame;
        if (currFrame !== undefined) {
            const newIdx = currFrame + offset;
            if (newIdx >= 0 && newIdx < this._currPlayer.traj.frameCount) {
                this._currPlayer?.traj.setFrame(currFrame + offset);
            }
        }
    }

    private onFrameSliderChange(): void {
        this._currPlayer?.traj.setFrame(Math.ceil(this._progressSlider.getValue()));
    }

    private updatePlaybackSpeed(): void {
        const sel = this._speedSelect.getValue();
        this._currPlayer?.setParameters({
            timeout: sel === "slow" ? 800 : (
                sel === "medium" ? 200 : 50)
        });
    }

    private onCreateStrucFromFrame(): void {
        if (this._currPlayer && this._strucComp) {
            const comp = duplicateComponentContainingStructure(Globals.stage, this._strucComp);
            comp.setName(comp.name + "_f" + (this._currPlayer.traj.currentFrame + 1));
        }
    }

    private onDownloadScreenshot(): void {
        if (this._currPlayer && this._strucComp) {
            const scrId = this._strucComp.name.replace(/(\s|\.)/g, "") + "_f" + (this._currPlayer.traj.currentFrame + 1);
            Globals.stage.makeImage().then(function (blob) {
                download(blob, "catana_mdtraj_" + scrId);
            });
        }
    }
}

export default ViewTrajectoryModal;