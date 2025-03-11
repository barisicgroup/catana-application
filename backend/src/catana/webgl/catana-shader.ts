import {ShaderRegistry} from "../../globals";

import "./fullscreenquad.vert";
import "./fullscreenquad.frag";
import "./selection.frag";
import "./blurred.frag";
import "./geometry.vert";
import "./data.frag";
import "./dilation.frag";

/**
 * Convenience class to configure and retrieve Catana shaders
 */
export namespace CatanaShader {

    export const enum SelectionShaderMode {
        MODE_NONE,
        MODE_COMPONENT,
        MODE_REPRESENTATION,
        MODE_PICKING,
        MODE_EVERYTHING
    }

    export function getFullscreenVertShader(): string {
        return ShaderRegistry.get("catana/webgl/fullscreenquad.vert");
    }

    export function getFullscreenFragShader(): string {
        return ShaderRegistry.get("catana/webgl/fullscreenquad.frag");
    }

    export function getBlurRedVertShader(): string {
        return getFullscreenVertShader();
    }

    export function getBlurRedFragShader(): string {
        return ShaderRegistry.get("catana/webgl/blurred.frag");
    }

    export function getSelectionVertShader(): string {
        return getFullscreenVertShader();
    }

    export function getSelectionFragShader(): string {
        let chunk_unpack_color: string = ShaderRegistry.get("shader/chunk/unpack_color.glsl");

        let shaderCode: string = ShaderRegistry.get("catana/webgl/selection.frag");
        shaderCode =
            "#define MODE_NONE " + SelectionShaderMode.MODE_NONE + "\n" +
            "#define MODE_COMPONENT " + SelectionShaderMode.MODE_COMPONENT + "\n" +
            "#define MODE_REPRESENTATION " + SelectionShaderMode.MODE_REPRESENTATION + "\n" +
            "#define MODE_PICKING " + SelectionShaderMode.MODE_PICKING + "\n" +
            "#define MODE_EVERYTHING " + SelectionShaderMode.MODE_EVERYTHING + "\n" +
            chunk_unpack_color + "\n" +
            "\n" + shaderCode;

        return shaderCode;
    }

    export function getDataVertShader(): string {
        return ShaderRegistry.get("catana/webgl/geometry.vert");
    }

    export function getDataFragShader(): string {
        return ShaderRegistry.get("catana/webgl/data.frag");
    }

    export function getDilationVertShader(): string {
        return getFullscreenVertShader();
    }

    export function getDilationFragShader(): string {
        return ShaderRegistry.get("catana/webgl/dilation.frag");
    }
}

export default CatanaShader;