/**
 * @file Picking Behavior
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import Stage from './stage'
import MouseObserver from './mouse-observer'
import Viewer from '../viewer/viewer'
import MouseControls from '../controls/mouse-controls'

class PickingBehavior {
  viewer: Viewer
  mouse: MouseObserver
  controls: MouseControls

  constructor (readonly stage: Stage) {
    this.stage = stage
    this.mouse = stage.mouseObserver
    this.controls = stage.mouseControls

    this.mouse.signals.clicked.add(this._onClick, this)
    this.mouse.signals.hovered.add(this._onHover, this)

    // Catana addition
    this.mouse.signals.mouseDown.add(this._onDown, this);
    this.mouse.signals.mouseUp.add(this._onUp, this);
    this.mouse.signals.dragged.add(this._onDrag, this);
  }

  _onClick (x: number, y: number) {
    const pickingProxy = this.stage.pickingControls.pick(x, y)
    this.stage.signals.clicked.dispatch(pickingProxy)
    this.controls.run('clickPick', pickingProxy, x, y); // Catana modification: add x,y
  }

  _onHover (x: number, y: number) {
    const pickingProxy = this.stage.pickingControls.pick(x, y)
    if (pickingProxy && this.mouse.down.equals(this.mouse.position)) {
      this.stage.transformComponent = pickingProxy.component
      this.stage.transformAtom = pickingProxy.atom
    }
    this.stage.signals.hovered.dispatch(pickingProxy)
    this.controls.run('hoverPick', pickingProxy, x, y); // Catana modification: add x,y
  }

  // Catana additions
  _onDown(x: number, y: number) {
    const pickingProxy = this.stage.pickingControls.pick(x, y);
    //this.stage.signals.clicked.dispatch(pickingProxy); // TODO implement?
    this.controls.run("downPick", pickingProxy, x, y);
  }
  _onUp(x:number, y: number) {
    const pickingProxy = this.stage.pickingControls.pick(x, y);
    //this.stage.signals.clicked.dispatch(pickingProxy); // TODO implement?
    this.controls.run("upPick", pickingProxy, x, y);
  }
  _onDrag(dx: number, dy: number, x: number, y: number) {
    const pickingProxy = this.stage.pickingControls.pick(x, y);
    //this.stage.signals.clicked.dispatch(pickingProxy); // TODO implement?
    this.controls.run("dragPick", pickingProxy, x, y, dx, dy);
  }

  dispose () {
    this.mouse.signals.clicked.remove(this._onClick, this)
    this.mouse.signals.hovered.remove(this._onHover, this)
  }
}

export default PickingBehavior
