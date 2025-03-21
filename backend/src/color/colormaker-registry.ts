/**
 * @file Colormaker Registry
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import { generateUUID } from '../math/math-utils'
import Colormaker, { ColormakerParameters } from './colormaker'
import FilterColormaker , { FilterSchemeData } from './filter-colormaker'
import Structure from '../structure/structure'
import CgStructure from "../catana/data_model/cg-structure";
import Component from "../component/component";

const ColormakerScales = {
  '': '',

    // Sequential
  OrRd: '[S] Orange-Red',
  PuBu: '[S] Purple-Blue',
  BuPu: '[S] Blue-Purple',
  Oranges: '[S] Oranges',
  BuGn: '[S] Blue-Green',
  YlOrBr: '[S] Yellow-Orange-Brown',
  YlGn: '[S] Yellow-Green',
  Reds: '[S] Reds',
  RdPu: '[S] Red-Purple',
  Greens: '[S] Greens',
  YlGnBu: '[S] Yellow-Green-Blue',
  Purples: '[S] Purples',
  GnBu: '[S] Green-Blue',
  Greys: '[S] Greys',
  YlOrRd: '[S] Yellow-Orange-Red',
  PuRd: '[S] Purple-Red',
  Blues: '[S] Blues',
  PuBuGn: '[S] Purple-Blue-Green',

    // Diverging
  Viridis: '[D] Viridis',
  Spectral: '[D] Spectral',
  RdYlGn: '[D] Red-Yellow-Green',
  RdBu: '[D] Red-Blue',
  PiYG: '[D] Pink-Yellowgreen',
  PRGn: '[D] Purplered-Green',
  RdYlBu: '[D] Red-Yellow-Blue',
  BrBG: '[D] Brown-Bluegreen',
  RdGy: '[D] Red-Grey',
  PuOr: '[D] Purple-Orange',

    // Qualitative
  Set1: '[Q] Set1',
  Set2: '[Q] Set2',
  Set3: '[Q] Set3',
  Dark2: '[Q] Dark2',
  Paired: '[Q] Paired',
  Pastel1: '[Q] Pastel1',
  Pastel2: '[Q] Pastel2',
  Accent: '[Q] Accent',

    // Other
  rainbow: '[?] Rainbow',
  rwb: '[?] Red-White-Blue'
}

const ColormakerModes = {
  '': '',

  rgb: 'Red Green Blue',
  hsv: 'Hue Saturation Value',
  hsl: 'Hue Saturation Lightness',
  hsi: 'Hue Saturation Intensity',
  lab: 'CIE L*a*b*',
  hcl: 'Hue Chroma Lightness'
}

/**
 * Class for registering {@link Colormaker}s. Generally use the
 * global {@link src/globals.js~ColormakerRegistry} instance.
 */
class ColormakerRegistry {
  schemes: { [k: string]: any }
  userSchemes: { [k: string]: any }

  // Catana addition
  scales: { [k: string]: number[] };

  constructor () {
    this.schemes = {}
    this.userSchemes = {}
    this.scales = {}; // Catana addition
  }

  getScheme (params: Partial<{ scheme: string } & ColormakerParameters>) {
    const p = params || {}
    const id = (p.scheme || '').toLowerCase()

    let SchemeClass

    if (id in this.schemes) {
      SchemeClass = this.schemes[ id ]
    } else if (id in this.userSchemes) {
      SchemeClass = this.userSchemes[ id ]
    } else {
      SchemeClass = Colormaker
    }

    return new SchemeClass(params)
  }

  // Catana addition
  getSchemeClass(scheme: string) {
    if (scheme in this.schemes) {
      return this.schemes[ scheme ];
    } else if (scheme in this.userSchemes) {
      return this.userSchemes[ scheme ];
    } else {
      return Colormaker;
    }
  }

  /**
   * Get an description of available schemes as an
   * object with id-label as key-value pairs
   * @param includeUserSchemes Whether to include the user schemes or not (Catana addition)
   * @return {Object} available schemes
   */
  getSchemes (includeUserSchemes: boolean = true) { // Catana addition: 'includeUserSchemes'
    const types: { [k: string]: any } = {}

    Object.keys(this.schemes).forEach(function (k) {
      types[ k ] = k
    })

    if (includeUserSchemes) { // Catana addition
      Object.keys(this.userSchemes).forEach(function (k) {
        types[ k ] = k
      })
    }

    return types
  }

  // Catana addition
  getSupportedSchemes(c: Component, includeUserSchemes: boolean = true) {
    const schemesList = includeUserSchemes ? [this.schemes, this.userSchemes] : [this.schemes];
    const supportedSchemes: { [k: string]: any } = {};
    for (const schemes of schemesList) {
      for (const [id, scheme] of Object.entries(schemes)) {
        if (c.supportsColorScheme(scheme)) {
          supportedSchemes[id] = id;
        }
      }
    }
    return supportedSchemes;
  }

  /**
   * Get an description of available scales as an
   * object with id-label as key-value pairs
   * @return {Object} available scales
   */
  getScales () {
    return ColormakerScales
  }

  getModes () {
    return ColormakerModes
  }

  /**
   * Add a scheme with a hardcoded id
   * @param {String} id - the id
   * @param {Colormaker} scheme - the colormaker
   *
   * @param scale - Catana addition
   * If this Colormaker uses an external color scale (like 'OrRd', 'PuBu', 'Viridis', 'Set1'...): undefined
   * If this Colormaker has its own independent color scale (like 'element' or 'resname'): its colors
   *
   * @return {undefined}
   */
  add (id: string, scheme: Colormaker, scale?: number[]) {
    id = id.toLowerCase()
    this.schemes[ id ] = scheme
    if (scale) this.scales[id] = scale;
  }

  /**
   * Register a custom scheme
   *
   * @example
   * // Create a class with a `atomColor` method that returns a hex color.
   * var schemeId = NGL.ColormakerRegistry.addScheme( function( params ){
   *     this.atomColor = function( atom ){
   *         if( atom.serial < 1000 ){
   *             return 0x0000FF;  // blue
   *         }else if( atom.serial > 2000 ){
   *             return 0xFF0000;  // red
   *         }else{
   *             return 0x00FF00;  // green
   *         }
   *     };
   * } );
   *
   * stage.loadFile( "rcsb://3dqb.pdb" ).then( function( o ){
   *     o.addRepresentation( "cartoon", { color: schemeId } );  // pass schemeId here
   *     o.autoView();
   * } );
   *
   * @param {Function|Colormaker} scheme - constructor or {@link Colormaker} instance
   * @param {String} label - scheme label
   * @return {String} id to refer to the registered scheme
   */
  addScheme (scheme: any, label?: string) {
    if (!(scheme instanceof Colormaker)) {
      scheme = this._createScheme(scheme)
    }

    return this._addUserScheme(scheme, label)
  }

  /**
   * Add a user-defined scheme
   * @param {Colormaker} scheme - the user-defined scheme
   * @param {String} [label] - scheme label
   * @return {String} id to refer to the registered scheme
   */
  _addUserScheme (scheme: any, label?: string) {
    label = label || ''
    const id = `${generateUUID()}|${label}`.toLowerCase()
    this.userSchemes[ id ] = scheme

    return id
  }

  /**
   * Remove the scheme with the given id
   * @param  {String} id - scheme to remove
   * @return {undefined}
   */
  removeScheme (id: string) {
    id = id.toLowerCase()
    delete this.userSchemes[ id ]
  }

  _createScheme (constructor: any) {
    const _Colormaker = function (this: any, params: ColormakerParameters) {
      Colormaker.call(this, params)
      constructor.call(this, params)
    }

    _Colormaker.prototype = Colormaker.prototype
    _Colormaker.prototype.constructor = Colormaker

    return _Colormaker
  }

  /**
   * Create and a filter-based coloring scheme. Supply a list with pairs
   * of colorname and filter for coloring by filters. Use the last
   * entry as a default (catch all) coloring definition.
   *
   * @example
   * var schemeId = NGL.ColormakerRegistry.addFilterScheme( [
   *     [ "red", "64-74 or 134-154 or 222-254 or 310-310 or 322-326" ],
   *     [ "green", "311-322" ],
   *     [ "yellow", "40-63 or 75-95 or 112-133 or 155-173 or 202-221 or 255-277 or 289-309" ],
   *     [ "blue", "1-39 or 96-112 or 174-201 or 278-288" ],
   *     [ "white", "*" ]
   * ], "Transmembrane 3dqb" );
   *
   * stage.loadFile( "rcsb://3dqb.pdb" ).then( function( o ){
   *     o.addRepresentation( "cartoon", { color: schemeId } );  // pass schemeId here
   *     o.autoView();
   * } );
   *
   * @param {Array} dataList - cloror-filter pairs
   * @param {String} label - scheme name
   * @return {String} id to refer to the registered scheme
   */
  addFilterScheme (dataList: FilterSchemeData, label?: string) {
    class MyFilterColormaker extends FilterColormaker {
      constructor (params: ({ structure: Structure } | { cgStructure: CgStructure }) & ColormakerParameters) { // Catana modification
        super(Object.assign({ dataList }, params))
      }
    }

    return this._addUserScheme(MyFilterColormaker, label)
  }

  /**
   * Check if a scheme with the given id exists
   * @param  {String}  id - the id to check
   * @return {Boolean} flag indicating if the scheme exists
   */
  hasScheme (id: string) {
    id = id.toLowerCase()
    return id in this.schemes || id in this.userSchemes
  }

  /**
   * @param id - The color scheme ID
   * @return The color scale related to the scheme with ID 'id'
   */
  getSchemeScale (id: string): null | number[] {
    return this.scales[id];
  }
}

export default ColormakerRegistry
