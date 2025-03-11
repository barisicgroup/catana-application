/// <reference types="@webgpu/types" />
// TODO remove <reference> tag?

import code from "./src/collision-rendering.wgsl";

import WgRendShader from "./wg-rend-shader";
import WgContext from "../wg-context";
import WgBuffer, {BufferFeature} from "../wg-buffer";
import {Camera, Color, Matrix4, Vector3, Vector4} from "three";
import WgRenderTarget from "../wg-render-target";

export enum WgRendCollisionShaderRadiusMode {
    COVALENT_WITH_LENIENCE_ADJUSTMENT = -1,
    COVALENT = -2
}

export enum WgRendCollisionShaderMode {
    O = 0,
    X = 1,
}

export interface WgRendCollisionShaderUniforms {
    camera: Camera;
    mode: WgRendCollisionShaderMode;
    color: string;
    opacity: number;
    lenience: number;
    radius: WgRendCollisionShaderRadiusMode | number;
    thickness: number;
}

/**
 * The collision rendering shader.
 *
 * Takes as input the buffer containing the positions of the collision elements (in our case, probably atoms, maybe
 * something else too in the future - 22/08/2022).
 * Each element will be treated as an INSTANCE and will be drawn using quad VERTICES (4 triangle-strip vertices).
 *
 * Takes as input also the collisions buffer, a U32 buffer where each bit encodes an element/atom. 0 means this element
 * does not collide with any other element. 1 means it does.
 *
 * This class also creates and manages the uniforms buffer,
 * taking its parameters in the constructor and in setUniforms()
 *
 * The elements/atoms that do collide will be drawn.
 * The ones that don't, will not.
 */
class WgRendCollisionShader extends WgRendShader {

    private readonly _target: WgRenderTarget;

    private readonly vertices: WgBuffer<Float32Array>;
    private readonly quadOffsets: WgBuffer<Float32Array>;
    //private readonly collisions: WgBuffer<Uint32Array>;
    private readonly uniforms: WgBuffer<Float32Array>;

    private uniformsArray: Float32Array;

    public constructor(context: WgContext,
                       vertices: WgBuffer<Float32Array>,
                       collisions: WgBuffer<Uint32Array>,
                       camera: Camera,
                       target: WgRenderTarget,
                       radius: number,
                       mode: WgRendCollisionShaderMode,
                       color: string,
                       opacity: number,
                       thickness: number) {

        const uniformsArray = WgRendCollisionShader.createUniforms({camera, radius, mode, color, opacity, thickness});
        const uniforms = WgBuffer.createUniform(context, Float32Array, uniformsArray, true);
        const buffers = [{
            group: 0,
            entries: [
                { binding: 0, buffer: uniforms },
                { binding: 1, buffer: collisions }
            ]
        }];

        const cache = context.getCache<GPURenderPipeline>(code, (module : any) => {
            return context.device.createRenderPipeline({
                layout: "auto" as any,
                vertex: {
                    module: module,
                    entryPoint: "vs_main",
                    // We have two  buffers for our vertex shader
                    buffers: [
                        // The first buffer describes our INSTANCES:
                        // Each element/atom is an instance and contains 4 floats (hence the format float32x4)
                        // The first three elements encode the element/atom's 3D world position: XYZ (respectively)
                        // The 4th element encodes additional data of the element/atom (currently unused - 22/08/2022)
                        {
                            arrayStride: Float32Array.BYTES_PER_ELEMENT * 4,
                            stepMode: "instance",
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x4"
                                }
                            ]
                        },

                        // The second buffer describes our VERTICES:
                        // Each INSTANCE (described in the previous buffer) will have the vertices described here
                        // That means that, in total, the number of vertices drawn will be: #INSTANCES * #VERTICES
                        // The vertices form a 2D quad that will face the camera (hence hte format float32x2)
                        // The two elements encode the X and Y positions of the quad's vertices
                        {
                            arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                            stepMode: "vertex",
                            attributes: [
                                {
                                    shaderLocation: 1,
                                    offset: 0,
                                    format: "float32x2"
                                }
                            ]
                        }
                    ]
                },
                fragment: {
                    module: module,
                    entryPoint: "fs_main",
                    targets: [
                        {
                            format: target.format,
                            // TODO blend?
                        }
                    ]
                },
                primitive: {
                    topology: "triangle-strip"
                }
            });
        });

        super(context, cache.module, cache.pipeline, buffers);
        this._target = target;
        this.uniformsArray = uniformsArray;

        this.vertices = vertices;
        /*const vert = new Float32Array([
            0, 0, 0, 0,
            10, 0, 0, 0,
            0, 10, 0, 0
        ]);
        this.vertices = WgBuffer.createStorage(context, [4, 3, 1], Float32Array, vert, [BufferFeature.VERTEX]);*/

        //this.collisions = collisions;
        this.uniforms = uniforms;

        const quadOffsets = new Float32Array([
             1,  1,
            -1,  1,
             1, -1,
            -1, -1,
        ]);
        this.quadOffsets = WgBuffer.createStorage(context, [2, 4, 1], Float32Array, quadOffsets, [BufferFeature.VERTEX]);
    }

    public get vertexBuffers(): readonly { slot: number; buffer: WgBuffer<any> }[] {
        return [
            { slot: 0, buffer: this.vertices },
            { slot: 1, buffer: this.quadOffsets }
        ];
    }

    public get vertexCount(): number {
        return this.quadOffsets.shape[1];
    }

    public get instanceCount(): number {
        return this.vertices.shape[1];
    }

    public dispose(): void {
        this.uniforms.dispose();
    }

    private static createUniforms(uniforms: Partial<WgRendCollisionShaderUniforms>, array?: Float32Array): Float32Array {
        const length = 16 + 3 + 1 + 3 + 1 + 1 + 1 + 1 + 1; // Unused 1 at the end for padding
        array = array || new Float32Array(length);
        console.assert(array.length === length);

        if (uniforms.camera) {
            let viewProj = new Matrix4().getInverse(uniforms.camera.matrix).premultiply(uniforms.camera.projectionMatrix);
            let right4 = new Vector4(-1, 0, 0, 0).applyMatrix4(uniforms.camera.matrix);
            let up4 = new Vector4(0, 1, 0, 0).applyMatrix4(uniforms.camera.matrix);
            array.set(viewProj.toArray());
            array.set(new Vector3(right4.x, right4.y, right4.z).toArray(), 16);
            array.set(new Vector3(up4.x, up4.y, up4.z).toArray(), 16 + 3 + 1);
        }

        if (uniforms.mode !== undefined) {
            //const radiusInPm_mode = new Uint32Array(array.buffer, Float32Array.BYTES_PER_ELEMENT * (16 + 3), 1);
            //const radius = (uniforms.radius !== undefined) ? Math.round(uniforms.radius * 100) << 16 : (radiusInPm_mode[0] & 0xffff0000);
            //const mode = (uniforms.mode !== undefined) ? uniforms.mode : (radiusInPm_mode[0] & 0x0000ffff);
            //radiusInPm_mode.set([radius | mode])
            //const mode = (uniforms.mode !== undefined) ? uniforms.mode :
            new Uint32Array(array.buffer, Float32Array.BYTES_PER_ELEMENT * (16 + 3), 1).set([uniforms.mode]);
        }

        if (uniforms.color !== undefined || uniforms.opacity !== undefined) {
            const color = new Uint32Array(array.buffer, Float32Array.BYTES_PER_ELEMENT * (16 + 3 + 1 + 3), 1);
            const rgb = (uniforms.color !== undefined) ? (new Color(uniforms.color).getHex() << 8) : (color[0] & 0xffffff00);
            const opacity = (uniforms.opacity !== undefined) ? Math.min(255, Math.max(0, Math.round(uniforms.opacity * 255))) : (color[0] & 0x000000ff);
            color.set([rgb | opacity]);
        }

        if (uniforms.lenience !== undefined) {
            array.set([uniforms.lenience], 16 + 3 + 1 + 3 + 1);
        }

        if (uniforms.radius !== undefined) {
            let radius: number;
            switch (uniforms.radius) {
                case WgRendCollisionShaderRadiusMode.COVALENT_WITH_LENIENCE_ADJUSTMENT:
                    radius = -1; break;
                case WgRendCollisionShaderRadiusMode.COVALENT:
                    radius = -2; break;
                default:
                    radius = uniforms.radius;
                    if (radius < 0) {
                        console.error("Unexpected value " + uniforms.radius + " requested for 'radius' in " +
                            "WgRendCollisionShader uniforms. Using mode 'Covalent with lenience adjustment' instead.");
                        radius = -1;
                    }
                    break;
            }
            array.set([radius], 16 + 3 + 1 + 3 + 1 + 1);
        }

        if (uniforms.thickness !== undefined) {
            array.set([uniforms.thickness], 16 + 3 + 1 + 3 + 1 + 1 + 1);
        }

        return array;
    }

    public setUniforms(uniforms: Partial<WgRendCollisionShaderUniforms>) {
        this.uniforms.write(WgRendCollisionShader.createUniforms(uniforms, this.uniformsArray));
    }

    /*public async setCamera(camera: Camera) {
        return this.uniforms.write(WgRendCollisionShader.createUniforms(camera, this.radius));
    }

    public async setRadius(radius: number) {
        this.radius = radius;
        await this.uniforms.write(new Float32Array([radius]), Float32Array.BYTES_PER_ELEMENT * (16 * 3));
    }*/

    public get view(): GPUTextureView {
        return this._target.view;
    }
}

export default WgRendCollisionShader;