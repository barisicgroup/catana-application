import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import internal from 'rollup-plugin-internal';
import { terser } from "rollup-plugin-terser";

var path = require('path');
var pkg = require('./package.json');

let rootPkg;

// By searching for "root" package.json, we also check 
// if this project is indeed a submodule of "full" Catana project or not.
try {
  rootPkg = require('../package.json');
}
catch (e) {
  rootPkg = undefined;
}

const releaseBuild = process.env.RELEASE === "true";

// Terser is used in release builds to minify the final JS file.
let releasePlugins = [terser()];

if (releaseBuild === false) {
  releasePlugins = [];
}

// When building UMD or ES6 module, mark dependencies as external
var moduleExternals = Object.keys(pkg.dependencies);
var moduleGlobals = { three: 'three' }; // UMD form complains if this isn't specified as a global

// For the bundled build, include three (remove it from the externals list)
var bundleExternals = moduleExternals.slice().splice(moduleExternals.indexOf('three'), 1)

// Catana additions (processShaderCode, wgsl, pdb)
function processShaderCode(code) {
  return code.replace(/[ \t]*\/\/.*\n/g, '')
    .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/ *\n */g, '\n')
}

function wgsl() {
  return {
    name: "wgsl",
    transform: function (code, id) {
      if (!id.endsWith(".wgsl")) return; // Ignore files that don't end with .wgsl
      const filename = path.basename(id).split(".")[0].replace(/-/g, "_");
      code = processShaderCode(code);
      return {
        code: "const " + filename + " = " + JSON.stringify(code) + ";export default " + filename + ";",
        map: { mappings: "" }
      };
    }
  }
}

function pdb() {
  return {
    name: "pdb",
    transform: function (code, id) {
      if (!id.endsWith(".pdb")) return; // Ignore files not ending with .pdb
      const filename = "pdb_embedded_" + path.basename(id).split(".")[0];
      code = code.replace(/\r\n/g, '\n')
      return {
        code: "const " + filename + " = " + JSON.stringify(code) + ";export default " + filename + ";",
        map: { mappings: "" }
      };
    }
  };
}

function glsl() {
  return {
    name: "glsl",
    transform: function (code, id) {
      if (!/\.(glsl|frag|vert)$/.test(id)) return;
      var src, key;
      if (path.basename(path.dirname(id)) === 'shader') {
        src = "../globals.js";
        key = "shader/" + path.basename(id);
      } else if (path.dirname(id).endsWith("/catana/webgl") || path.dirname(id).endsWith("\\catana\\webgl")) {
        src = "../../globals.js";
        key = "catana/webgl/" + path.basename(id);
      } else {
        src = "../../globals.js";
        key = "shader/chunk/" + path.basename(id);
      }
      var registryImport = 'import { ShaderRegistry } from "' + src + '";';
      var shader = JSON.stringify(processShaderCode(code)); // Catana modification: now using this function
      var register = "ShaderRegistry.add('" + key + "', " + shader + ");";
      code = registryImport + register;
      return { code: code, map: { mappings: "" } };
    }
  };
}

function text() {
  return {
    name: "text",
    transform: function (code, id) {
      if (!/\.(txt)$/.test(id)) return;
      code = 'export default ' + JSON.stringify(code) + ';';
      return { code: code, map: { mappings: "" } };
    }
  };
}

const moduleConfig = {
  input: 'build/js/src/catana.js',
  plugins: [
    resolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      namedExports: {
        'chroma-js': ['scale'],
        'signals': ['Signal'],
        'sprintf-js': ['sprintf']
      }
    }),
    glsl(),
    wgsl(), // Catana addition
    pdb(), // Catana addition
    text(),
    json()
  ],
  output: [
    {
      file: "build/catana.umd.js",
      format: 'umd',
      name: 'CATANA',
      sourcemap: true,
      globals: moduleGlobals // three.js
    },
    {
      file: "build/catana.esm.js",
      format: 'es',
      name: 'CATANA',
      sourcemap: true
      //globals: globals
    }
  ],
  external: moduleExternals,
  onwarn: function (warning) {
    // Skip this-is-undefined warning (plenty of them present because of decorators)
    if (warning.code === 'THIS_IS_UNDEFINED') { return; }
    console.warn(warning.message);
  }
}

const bundleConfig = {
  input: 'build/js/src/catana.js',
  plugins: [
    resolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      namedExports: {
        'chroma-js': ['scale'],
        'signals': ['Signal'],
        'sprintf-js': ['sprintf']
      }
    }),
    glsl(),
    wgsl(), // Catana addition
    pdb(), // Catana addition
    text(),
    json(),
    internal(['three']),
    ...releasePlugins
  ],
  output: {
    file: rootPkg === undefined ? "build/catana.js" : ("../" + rootPkg.webapp_folder + "dist/js/catana.js"),
    format: 'umd',
    name: 'CATANA',
    sourcemap: true //Ideally releaseBuild === false but sorcery would fail now so ignoring this
  },
  external: bundleExternals,
  onwarn: function (warning) {
    // Skip this-is-undefined warning (plenty of them present because of decorators)
    if (warning.code === 'THIS_IS_UNDEFINED') { return; }
    console.warn(warning.message);
  }
}

export default [
  moduleConfig, bundleConfig
]
