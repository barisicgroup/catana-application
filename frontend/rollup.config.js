import { terser } from "rollup-plugin-terser";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import internal from 'rollup-plugin-internal';

let pkg = require("./package.json");
let bundleExternals = Object.keys(pkg.dependencies);

// Necessary to include some libraries in the bundled build manually,
// but at the same time, we do not want to include, e.g., catana-backend.
let bundleInternal = ["codejar"];

for(let int of bundleInternal) {
    bundleExternals.splice(bundleExternals.indexOf(int), 1);
}

const releaseBuild = process.env.RELEASE === "true";

let plugins = [
    resolve({
        jsnext: true,
        main: true
    }),
    commonjs(),
    internal(bundleInternal)
];

if (releaseBuild === true) {
    plugins.push(terser());
}

const bundleConfig = {
    input: "build/js/src/main.js",
    plugins: plugins,
    output: {
        file: "webapp/dist/js/webapp.js",
        format: "umd",
        name: "WEBAPP",
        sourcemap: true, //Ideally releaseBuild === false but sorcery would fail now so ignoring this
        globals: {
            "catana-backend": "CATANA"
        }
    },
    external: bundleExternals
}

export default [bundleConfig];
