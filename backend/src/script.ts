/**
 * @file Script
 * @author Alexander Rose <alexander.rose@weirdbyte.de>, modified by Catana development team
 * @private
 */

import { Signal } from 'signals'
import ScriptingApi from './catana/scripting/scripting-api'

import { Log } from './globals'
import Stage from './stage/stage'

export interface ScriptSignals {
  elementAdded: Signal
  elementRemoved: Signal
  nameChanged: Signal
}

/**
 * Interface for scripts, i.e., short pieces of code
 * enabling to execute custom functionality during runtime.
 */
export interface IScript {
  /**
   * Execute the script
   * @param {Stage} stage the stage context
   * @param {string[]} args optional arguments for the script
   * @return {Promise} promise resolving when the script finished running
   */
  run(stage: Stage, args?: any[]): Promise<unknown>;
}

/**
 * Class representing JavaScript scripts.
 */
class JSScript implements IScript {
  readonly signals: ScriptSignals = {
    elementAdded: new Signal(),
    elementRemoved: new Signal(),
    nameChanged: new Signal()
  }

  readonly dir: string
  readonly fn: Function

  readonly type = 'Script'

  /**
   * Create a script instance
   * @param {String} functionBody - the function source (can reference "stage" and "scriptingApi" variables)
   * @param {String} name - name of the script
   * @param {String} path - path of the script
   */
  constructor(functionBody: string, readonly name: string, readonly path: string) {
    this.dir = path.substring(0, path.lastIndexOf('/') + 1)

    try {
      /* eslint-disable no-new-func */
      this.fn = new Function('stage', 'args', 'scriptingApi', 'log', '__this', '__name', '__path', '__dir', functionBody)
    } catch (e) {
      Log.error('Script compilation failed', e)
      this.fn = function () { }
    }
  }

  run(stage: Stage, args?: any[]) {
    return new Promise((resolve, reject) => {
      try {
        this.fn.apply(null, [stage, args ?? [], ScriptingApi, ScriptingApi.log, this, this.name, this.path, this.dir])
        resolve(undefined)
      } catch (e) {
        //Log.error('Script.fn', e)
        reject(e)
      }
    })
  }
}

export default JSScript
