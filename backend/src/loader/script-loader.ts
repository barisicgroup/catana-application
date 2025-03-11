/**
 * @file Script Loader
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import Loader from './loader'
import JSScript, { IScript } from '../script'
import { JsScriptExtensions } from '../globals'
import JSPyScript from '../catana/scripting/jspyscript'

/**
 * Script loader class
 * @extends Loader
 */
class ScriptLoader extends Loader {
  /**
   * Load script
   * @return {Promise} resolves to the loaded {@link IScript}
   */
  load(): Promise<IScript> {
    return this.streamer.read().then(() => {
      if (JsScriptExtensions.includes(this.parameters.ext)) {
        return new JSScript(
          this.streamer.asText(), this.parameters.name, this.parameters.path
        )
      }
      return new JSPyScript(
        this.streamer.asText()
      );
    })
  }
}

export default ScriptLoader
