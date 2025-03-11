import { Vector3 } from "three";
import Buffer, { BufferParameters, BufferDefaultParameters } from "../../buffer/buffer";
import { CylinderBufferParameters, CylinderBufferDefaultParameters } from "../../buffer/cylinder-buffer";
import CylinderGeometryBuffer from '../../buffer/cylindergeometry-buffer';
import CylinderImpostorBuffer from '../../buffer/cylinderimpostor-buffer';
import RibbonBuffer from "../../buffer/ribbon-buffer";
import TubeMeshBuffer, { TubeMeshBufferParameters } from "../../buffer/tubemesh-buffer";
import WidelineBuffer, { WideLineBufferDefaultParameters, WideLineBufferParameters } from "../../buffer/wideline-buffer";
import { Debug } from "../../globals";
import HermitSpline from "./hermit-spline";
import { Picker } from "../../utils/picker";
import SphereGeometryBuffer from "../../buffer/spheregeometry-buffer";
import SphereImpostorBuffer from "../../buffer/sphereimpostor-buffer";
import ArrowBuffer, { ArrowBufferDefaultParameters, ArrowBufferParameters } from "../../buffer/arrow-buffer";
import ConeBuffer, { ConeBufferDefaultParameters, ConeBufferParameters } from "../../buffer/cone-buffer";
import BoxBuffer from "../../buffer/box-buffer";
import TextBuffer, { TextBufferDefaultParameters, TextBufferParameters } from "../../buffer/text-buffer";

/**
* The purpose of this class is to provide a wrapper to selected NGL buffers
* allowing to create given geometries in a more accessible way.
*/
class BufferCreator {
    public static readonly defaultTubeMeshBufferParams: Partial<TubeMeshBufferParameters> = Object.assign(
        BufferDefaultParameters, {
        radialSegments: 8,
        capped: true,
        aspectRatio: 1.0
    });

    public static readonly defaultRibbonBufferParams: Partial<BufferParameters> = BufferDefaultParameters;

    public static readonly defaultWidelineBufferParams: Partial<WideLineBufferParameters> = WideLineBufferDefaultParameters;

    public static readonly defaultCylinderBufferParams: Partial<CylinderBufferParameters> = Object.assign(
        CylinderBufferDefaultParameters, {
        radialSegments: 8
    });

    public static readonly defaultArrowBufferParams: Partial<ArrowBufferParameters> = ArrowBufferDefaultParameters;

    public static readonly defaultConeBufferParams: Partial<ConeBufferParameters> = ConeBufferDefaultParameters;

    public static readonly defaultBoxBufferParams: Partial<BufferParameters> = BufferDefaultParameters;

    public static readonly defaultTextBufferParams: Partial<TextBufferParameters> = TextBufferDefaultParameters;

    /** 
     * Creates tube mesh buffer, using Hermit interpolation for the subdivisions.
     * @remarks If you want to create buffer for structural data (e.g. Structure/CgStructure), use Spline classes instead
     * as they work much better.
     * 
     * @param pathElemPositions positions of the elements along the tube
     * @param pathElemSizes sizes of elements along the tube
     * @param pathElemColors colors of elements along the tube
     * @param interpolationSubdivisions number of subdivisions, i.e., the number of additional points to be added between every neighbouring elements
     * @param params tube mesh buffer parameters
     * @returns instance of the buffer
    */
    public static createTubeMeshBuffer(pathElemPositions: Vector3[], pathElemSizes: number[], pathElemColors: Vector3[],
        interpolationSubdivisions: number = 1,
        params: Partial<TubeMeshBufferParameters> = this.defaultTubeMeshBufferParams): Buffer {

        return this.createTubeRibbonCommon(pathElemPositions, pathElemSizes, pathElemColors, interpolationSubdivisions,
            (posArray: Float32Array, normArray: Float32Array, tangArray: Float32Array,
                binormArray: Float32Array, colArray: Float32Array, sizeArray: Float32Array) => {
                return new TubeMeshBuffer(
                    Object.assign({}, {
                        'position': posArray,
                        'size': sizeArray,
                        'normal': normArray,
                        'binormal': binormArray,
                        'tangent': tangArray,
                        'color': colArray
                    }),
                    params);
            });
    }

    /** 
     * Creates tube mesh buffer, using Hermit interpolation for the subdivisions.
     * @remarks If you want to create buffer for structural data (e.g. Structure/CgStructure), use Spline classes instead
     * as they work much better.
     * 
     * @param pathElemPositions positions of the elements along the tube
     * @param elemsSize size of elements along the tube
     * @param elemColor color of elements along the tube
     * @param interpolationSubdivisions number of subdivisions, i.e., the number of additional points to be added between every neighbouring elements
     * @param params tube mesh buffer parameters
     * @returns instance of the buffer
    */
    public static createTubeMeshBufferUniformParams(pathElemPositions: Vector3[], elemsSize: number, elemsColor: Vector3,
        interpolationSubdivisions: number = 1,
        params: Partial<TubeMeshBufferParameters> = this.defaultTubeMeshBufferParams): Buffer {
        let pathElemSizes = new Array(pathElemPositions.length);
        let pathElemColors = new Array(pathElemPositions.length);

        pathElemSizes.fill(elemsSize);
        pathElemColors.fill(elemsColor);

        return this.createTubeMeshBuffer(pathElemPositions, pathElemSizes, pathElemColors,
            interpolationSubdivisions, params);
    }

    /** 
     * Creates ribbon buffer, using Hermit interpolation for the subdivisions.
     * 
     * @remarks If you want to create buffer for structural data (e.g. Structure/CgStructure), use Spline classes instead
     * as they work much better.
     * 
     * @param pathElemPositions positions of the elements along the ribbon
     * @param pathElemSizes sizes of elements along the ribbon
     * @param pathElemColors colors of elements along the ribbon
     * @param interpolationSubdivisions number of subdivisions, i.e., the number of additional points to be added between every neighbouring elements
     * @param params ribbon buffer parameters
     * @returns instance of the buffer
    */
    public static createRibbonBuffer(pathElemPositions: Vector3[], pathElemSizes: number[], pathElemColors: Vector3[],
        interpolationSubdivisions: number = 1,
        params: Partial<BufferParameters> = this.defaultRibbonBufferParams): Buffer {

        return this.createTubeRibbonCommon(pathElemPositions, pathElemSizes, pathElemColors, interpolationSubdivisions,
            (posArray: Float32Array, normArray: Float32Array, tangArray: Float32Array,
                binormArray: Float32Array, colArray: Float32Array, sizeArray: Float32Array) => {
                return new RibbonBuffer(
                    Object.assign({}, {
                        'position': posArray,
                        'size': sizeArray,
                        'normal': binormArray,
                        'dir': normArray,
                        'color': colArray
                    }),
                    params);
            });
    }

    /** 
    * Creates ribbon buffer, using Hermit interpolation for the subdivisions.
    * 
    * @remarks If you want to create buffer for structural data (e.g. Structure/CgStructure), use Spline classes instead
    * as they work much better.
    * 
    * @param pathElemPositions positions of the elements along the ribbon
    * @param elemsSize size of elements along the ribbon
    * @param elemColor color of elements along the ribbon
    * @param interpolationSubdivisions number of subdivisions, i.e., the number of additional points to be added between every neighbouring elements
    * @param params ribbon buffer parameters
    * @returns instance of the buffer
   */
    public static createRibbonBufferUniformParams(pathElemPositions: Vector3[], elemsSize: number, elemsColor: Vector3,
        interpolationSubdivisions: number = 1,
        params: Partial<TubeMeshBufferParameters> = this.defaultRibbonBufferParams) {
        let pathElemSizes = new Array(pathElemPositions.length);
        let pathElemColors = new Array(pathElemPositions.length);

        pathElemSizes.fill(elemsSize);
        pathElemColors.fill(elemsColor);

        return this.createRibbonBuffer(pathElemPositions, pathElemSizes, pathElemColors,
            interpolationSubdivisions, params);
    }

    /**
     * Creates wideline buffer representing a single line between two points
     * 
     * @param startPos position of the start point
     * @param endPos position of the end point
     * @param startColor color of the start point
     * @param endColor color of the end point
     * @param lineWidth width of the line
     * @param params line parameters
     * @returns instance of the buffer
     */
    public static createWideLineBuffer(startPos: Vector3, endPos: Vector3, startColor: Vector3,
        endColor: Vector3, lineWidth: number, params: Partial<WideLineBufferParameters> = this.defaultWidelineBufferParams): Buffer {
        return new WidelineBuffer(Object.assign({}, {
            position1: Float32Array.of(startPos.x, startPos.y, startPos.z),
            position2: Float32Array.of(endPos.x, endPos.y, endPos.z),
            color: Float32Array.of(startColor.x, startColor.y, startColor.z),
            color2: Float32Array.of(endColor.x, endColor.y, endColor.z),
        }), Object.assign(params, {
            linewidth: lineWidth,
            opacity: 1.0
        }));
    }

    /**
     * Creates wideline buffer representing multiple lines
     * 
     * @param position1 array of start XYZ positions
     * @param position2 array of end XYZ positions
     * @param color array of start points colors
     * @param color2 array of end points colors
     * @param picking picker instance
     * @param lineWidth width of the lines
     * @param params additional wideline parameters
     * @returns instance of the buffer
     */
    public static createWideLineBufferFromArrays(position1: Float32Array, position2: Float32Array,
        color: Float32Array, color2: Float32Array,
        picking?: Picker,
        lineWidth: number = 1,
        params: Partial<WideLineBufferParameters> = this.defaultCylinderBufferParams): Buffer {
        return new WidelineBuffer(Object.assign({}, {
            position1: position1,
            position2: position2,
            color: color,
            color2: color2,
            picking: picking
        }), Object.assign(params, {
            linewidth: lineWidth,
            opacity: 1.0
        }));
    }

    /**
     * Creates wideline buffer representing multiple lines (~ GL_LINES style).
     * Example: A,B,C,D vertices will result in lines A-B and C-D.
     * 
     * @param vertices list of positions of line points
     * @param colors list of colors of line points
     * @param lineWidth width of the lines
     * @param params additional line parameters
     * @returns wideline buffer instance
     */
    public static createWideLinePairsBuffer(vertices: Vector3[], colors: Vector3[], lineWidth: number,
        params: Partial<WideLineBufferParameters> = this.defaultWidelineBufferParams): Buffer {
        const arrElems = (vertices.length / 2) * 3;

        const position1 = new Float32Array(arrElems);
        const position2 = new Float32Array(arrElems);
        const color = new Float32Array(arrElems);
        const color2 = new Float32Array(arrElems);

        for (let i = 0; i < vertices.length - 1; i += 2) {
            const buffArrayStartPos = 3 * (i / 2);

            position1[buffArrayStartPos] = vertices[i].x;
            position1[buffArrayStartPos + 1] = vertices[i].y;
            position1[buffArrayStartPos + 2] = vertices[i].z;

            color[buffArrayStartPos] = colors[i].x;
            color[buffArrayStartPos + 1] = colors[i].y;
            color[buffArrayStartPos + 2] = colors[i].z;

            position2[buffArrayStartPos] = vertices[i + 1].x;
            position2[buffArrayStartPos + 1] = vertices[i + 1].y;
            position2[buffArrayStartPos + 2] = vertices[i + 1].z;

            color2[buffArrayStartPos] = colors[i + 1].x;
            color2[buffArrayStartPos + 1] = colors[i + 1].y;
            color2[buffArrayStartPos + 2] = colors[i + 1].z;
        }

        return new WidelineBuffer(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'color': color,
            'color2': color2,
        }), Object.assign(params, {
            'linewidth': lineWidth
        }));
    }

    /**
     * Creates wideline buffer representing line strip (~ GL_LINE_STRIP style).
     * Example: A,B,C,D vertices will result in lines A-B-C-D.
     * 
     * @param vertices list of positions of line points
     * @param colors list of colors of line points
     * @param lineWidth width of the lines
     * @param pickingIds picking indices
     * @param pickingCreator function creating picker instance for given array of ids
     * @param params additional line parameters
     * @returns wideline buffer instance
     */
    public static createWideLineStripBuffer(vertices: Vector3[], colors: Vector3[], lineWidth: number,
        pickingIds?: number[], pickingCreator?: (idsArr: number[]) => Picker,
        params: Partial<WideLineBufferParameters> = this.defaultWidelineBufferParams): Buffer {
        const arrElems = (vertices.length - 1) * 3;

        const position1 = new Float32Array(arrElems);
        const position2 = new Float32Array(arrElems);
        const color = new Float32Array(arrElems);
        const color2 = new Float32Array(arrElems);

        for (let i = 0; i < vertices.length - 1; ++i) {
            const buffArrayStartPos = 3 * i;

            position1[buffArrayStartPos] = vertices[i].x;
            position1[buffArrayStartPos + 1] = vertices[i].y;
            position1[buffArrayStartPos + 2] = vertices[i].z;

            color[buffArrayStartPos] = colors[i].x;
            color[buffArrayStartPos + 1] = colors[i].y;
            color[buffArrayStartPos + 2] = colors[i].z;

            position2[buffArrayStartPos] = vertices[i + 1].x;
            position2[buffArrayStartPos + 1] = vertices[i + 1].y;
            position2[buffArrayStartPos + 2] = vertices[i + 1].z;

            color2[buffArrayStartPos] = colors[i + 1].x;
            color2[buffArrayStartPos + 1] = colors[i + 1].y;
            color2[buffArrayStartPos + 2] = colors[i + 1].z;
        }

        return new WidelineBuffer(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'color': color,
            'color2': color2,
            'picking': pickingCreator !== undefined && pickingIds !== undefined ? pickingCreator(pickingIds) : undefined,
        }), Object.assign(params, {
            'linewidth': lineWidth
        }));
    }

    /**
     * Creates cylinder buffer representing a single cylinder.
     * 
     * @param startPos cylinder start position
     * @param endPos cylinder end position
     * @param startColor cylinder start color
     * @param endColor cylinder end color
     * @param radius radius of the cylinder
     * @param openEnded is the cylinder open ended (no face on top & bottom) or not
     * @param disableImpostor should rendering using impostors be disabled or not
     * @param params additional cylinder parameters
     * @returns cylinder buffer instance
     */
    public static createCylinderBuffer(startPos: Vector3, endPos: Vector3, startColor: Vector3,
        endColor: Vector3, radius: number, openEnded: boolean = false, disableImpostor: boolean = false,
        params: Partial<CylinderBufferParameters> = this.defaultCylinderBufferParams): Buffer {
        const SelectedBufferClass = disableImpostor ? CylinderGeometryBuffer : CylinderImpostorBuffer;

        return new SelectedBufferClass(Object.assign({}, {
            'position1': Float32Array.of(startPos.x, startPos.y, startPos.z),
            'position2': Float32Array.of(endPos.x, endPos.y, endPos.z),
            'color': Float32Array.of(startColor.x, startColor.y, startColor.z),
            'color2': Float32Array.of(endColor.x, endColor.y, endColor.z),
            'radius': Float32Array.of(radius),
        }), Object.assign(params, {
            openEnded: openEnded,
            disableImpostor: disableImpostor
        }));
    }

    /**
     * Creates cylinder buffer representing multiple cylinders (~ GL_LINES style).
     *  
     * @param vertices positions of the cylinders' points
     * @param colors colors of the cylinders' points
     * @param radiuses radiuses of the cylinders. |vertices| === |colors| === |radiuses*2|
     * @param openEnded should the cylinders be open-ended
     * @param disableImpostor should the impostor rendering be disabled for cylinders
     * @param params additional cylinder buffer parameters
     * @returns instance of cylinder buffer
     */
    public static createCylinderPairsBuffer(vertices: Vector3[], colors: Vector3[], radiuses: number[],
        openEnded: boolean = false, disableImpostor: boolean = false,
        params: Partial<CylinderBufferParameters> = this.defaultCylinderBufferParams): Buffer {
        const SelectedBufferClass = disableImpostor ? CylinderGeometryBuffer : CylinderImpostorBuffer;

        const arrElems = (vertices.length / 2) * 3;

        const position1 = new Float32Array(arrElems);
        const position2 = new Float32Array(arrElems);
        const color = new Float32Array(arrElems);
        const color2 = new Float32Array(arrElems);
        const radius = new Float32Array(radiuses); // Radius is per cylinder, not element

        for (let i = 0; i < vertices.length - 1; i += 2) {
            const buffArrayStartPos = 3 * (i / 2);

            position1[buffArrayStartPos] = vertices[i].x;
            position1[buffArrayStartPos + 1] = vertices[i].y;
            position1[buffArrayStartPos + 2] = vertices[i].z;

            color[buffArrayStartPos] = colors[i].x;
            color[buffArrayStartPos + 1] = colors[i].y;
            color[buffArrayStartPos + 2] = colors[i].z;

            position2[buffArrayStartPos] = vertices[i + 1].x;
            position2[buffArrayStartPos + 1] = vertices[i + 1].y;
            position2[buffArrayStartPos + 2] = vertices[i + 1].z;

            color2[buffArrayStartPos] = colors[i + 1].x;
            color2[buffArrayStartPos + 1] = colors[i + 1].y;
            color2[buffArrayStartPos + 2] = colors[i + 1].z;
        }

        return new SelectedBufferClass(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'color': color,
            'color2': color2,
            'radius': radius,
        }), Object.assign(params, {
            openEnded: openEnded,
            disableImpostor: disableImpostor
        }));
    }

    /**
    * Creates cylinder buffer representing multiple cylinder strips (~ GL_LINE_STRIP style).
    *  
    * @param vertices positions of the cylinders' points
    * @param colors colors of the cylinders' points
    * @param radiuses radiuses of the cylinders. |vertices| === |colors| === |radiuses+1|
    * @param pickingIds picking indices of the cylinders
    * @param pickingCreator callback creating picker instance for given ids
    * @param openEnded should the cylinders be open-ended
    * @param disableImpostor should the impostor rendering be disabled for cylinders
    * @param opacity opacity of the cylinders
    * @param params additional cylinder buffer parameters
    * @returns instance of cylinder buffer
    */
    public static createCylinderStripBuffer(vertices: Vector3[], colors: Vector3[], radiuses: number[],
        pickingIds?: number[], pickingCreator?: (idsArr: number[]) => Picker,
        openEnded: boolean = false, disableImpostor: boolean = false, opacity: number = 1.0,
        params: Partial<CylinderBufferParameters> = this.defaultCylinderBufferParams): Buffer {

        const arrElems = (vertices.length - 1) * 3;

        const position1 = new Float32Array(arrElems);
        const position2 = new Float32Array(arrElems);
        const color = new Float32Array(arrElems);
        const color2 = new Float32Array(arrElems);
        const radius = new Float32Array(radiuses); // Radius is per cylinder, not element

        for (let i = 0; i < vertices.length - 1; ++i) {
            const buffArrayStartPos = 3 * i;

            position1[buffArrayStartPos] = vertices[i].x;
            position1[buffArrayStartPos + 1] = vertices[i].y;
            position1[buffArrayStartPos + 2] = vertices[i].z;

            color[buffArrayStartPos] = colors[i].x;
            color[buffArrayStartPos + 1] = colors[i].y;
            color[buffArrayStartPos + 2] = colors[i].z;

            position2[buffArrayStartPos] = vertices[i + 1].x;
            position2[buffArrayStartPos + 1] = vertices[i + 1].y;
            position2[buffArrayStartPos + 2] = vertices[i + 1].z;

            color2[buffArrayStartPos] = colors[i + 1].x;
            color2[buffArrayStartPos + 1] = colors[i + 1].y;
            color2[buffArrayStartPos + 2] = colors[i + 1].z;
        }

        const picking = pickingCreator !== undefined && pickingIds !== undefined ? pickingCreator(pickingIds) : undefined;

        return this.createCylinderStripBufferFromArrays(position1, position2, color, color2, radius,
            picking, openEnded, disableImpostor, opacity, params);
    }

    /**
     * Creates cylinder buffer representing multiple cylinders.
     * 
     * @param position1 starting positions of cylinders
     * @param position2 ending positions of cylinders
     * @param color starting colors of cylinders
     * @param color2 ending colors of cylinders
     * @param radius radii of cylinders
     * @param picking picker instance
     * @param openEnded should cylinders be open-ended
     * @param disableImpostor should the impostor rendering be disabled
     * @param opacity opacity of the cylinders
     * @param params additional cylinder buffer parameters 
     * @returns instance of cylinder buffer
     */
    public static createCylinderStripBufferFromArrays(position1: Float32Array, position2: Float32Array,
        color: Float32Array, color2: Float32Array, radius: Float32Array,
        picking?: Picker,
        openEnded: boolean = false, disableImpostor: boolean = false,
        opacity: number = 1.0,
        params: Partial<CylinderBufferParameters> = this.defaultCylinderBufferParams): CylinderImpostorBuffer | CylinderGeometryBuffer {
        const SelectedBufferClass = disableImpostor ? CylinderGeometryBuffer : CylinderImpostorBuffer;
        return new SelectedBufferClass(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'color': color,
            'color2': color2,
            'radius': radius,
            'picking': picking
        }), Object.assign(params, {
            openEnded: openEnded,
            disableImpostor: disableImpostor,
            opacity: opacity
        }));
    }

    /**
     * Creates sphere buffer representing multiple spheres.
     * 
     * @param position positions of spheres' centers
     * @param color colors of spheres
     * @param radius radii of spheres
     * @param picking picker instance
     * @param openEnded TODO WILL BE DELETED LATER
     * @param disableImpostor should impostors be disabled
     * @param params additional buffer parameters
     * @returns buffer instance
     */
    public static createSphereBufferFromArrays(position: Float32Array, color: Float32Array, radius: Float32Array,
        picking: Picker | undefined,
        openEnded: boolean = false, disableImpostor: boolean = false,
        params: Partial<CylinderBufferParameters> = this.defaultCylinderBufferParams): SphereImpostorBuffer | SphereGeometryBuffer {
        const SelectedBufferClass = disableImpostor ? SphereGeometryBuffer : SphereImpostorBuffer;
        return new SelectedBufferClass(Object.assign({}, {
            'position': position,
            'color': color,
            'radius': radius,
            'picking': picking
        }), Object.assign(params, {
            openEnded: openEnded,
            disableImpostor: disableImpostor,
            opacity: params.opacity ?? 1.0
        }));
    }

    /**
     * Creates arrow buffer representing multiple arrows.
     * @remark Arrow Buffer does not inherit from Buffer!
     * 
     * @param position1 starting positions of arrows
     * @param position2 ending positions (tips) of arrows
     * @param color arrow colors
     * @param radius radii of arrows
     * @param picking picker instance
     * @param index TODO not sure
     * @param opacity opacity of the arrows
     * @param params additional arrow buffer parameters
     * @returns arrow buffer instance
     */
    public static createArrowBufferFromArrays(position1: Float32Array, position2: Float32Array, color: Float32Array, radius: Float32Array,
        picking: Picker | undefined, index: Uint32Array | undefined, opacity: number | undefined = undefined,
        params: Partial<ArrowBufferParameters> = this.defaultArrowBufferParams): ArrowBuffer {
        return new ArrowBuffer(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'radius': radius,
            'color': color,
            'picking': picking,
            'index': index
        }), Object.assign(params, {
            opacity: opacity !== undefined ? opacity : params.opacity
        }));
    }

    /**
     * Creates cone buffer representing multiple cones.
     * 
     * @param position1 starting positions of cones
     * @param position2 ending positions of cones
     * @param color cone start colors
     * @param color2 cone end colors
     * @param radius radii of cones
     * @param picking picker instance
     * @param index TODO not sure
     * @param opacity opacity of cones
     * @param params additional cone parameters
     * @returns cone buffer instance
     */
    public static createConeBufferFromArrays(position1: Float32Array, position2: Float32Array, color: Float32Array, color2: Float32Array | undefined, radius: Float32Array,
        picking: Picker | undefined, index: Uint32Array | undefined, opacity: number | undefined = undefined,
        params: Partial<ConeBufferParameters> = this.defaultConeBufferParams): Buffer {
        return new ConeBuffer(Object.assign({}, {
            'position1': position1,
            'position2': position2,
            'radius': radius,
            'color': color,
            'color2': color2 ? color2 : color,
            'picking': picking,
            'index': index
        }), Object.assign(params, {
            opacity: opacity !== undefined ? opacity : params.opacity
        }));
    }

    /**
     * Creates box buffer representing multiple boxes.
     * 
     * @param position centroids of each box
     * @param color colors of boxes
     * @param heightAxis height (axis) of each box
     * @param depthAxis depth (axis) of each box
     * @param size size (width) of each box
     * @param picking picker instance
     * @param params additional box buffer parameters
     * @returns box buffer instance
     */
    public static createBoxBufferFromArrays(position: Float32Array, color: Float32Array, heightAxis: Float32Array, depthAxis: Float32Array, size: Float32Array,
        picking: Picker | undefined, params: Partial<BufferParameters> = this.defaultBoxBufferParams): BoxBuffer {
        return new BoxBuffer(Object.assign({}, {
            'position': position,
            'color': color,
            'heightAxis': heightAxis,
            'depthAxis': depthAxis,
            'size': size,
            'picking': picking
        }), Object.assign(params, {}));
    }

    /**
     * Creates text buffer representing a single 3D text element.
     * 
     * @param position position of the text
     * @param color text color
     * @param size size of the text/font
     * @param text text to be shown
     * @param params additional text buffer parameters
     * @returns text buffer instance
     */
    public static createTextBuffer(position: Vector3, color: Vector3, size: number, text: string,
        params: Partial<TextBufferParameters> = this.defaultTextBufferParams): Buffer {
        return new TextBuffer(Object.assign({}, {
            'position': Float32Array.of(position.x, position.y, position.z),
            'color': Float32Array.of(color.x, color.y, color.z),
            'size': new Float32Array([size]),
            'text': [text]
        }), Object.assign(params, {}));
    }

    /**
     * Creates text buffer representing multiple 3D text elements.
     * 
     * @param position positions of the text elements
     * @param color colors of the text elements
     * @param size sizes of the text elements
     * @param text texts to be shown
     * @param params additional text buffer parameters
     * @returns text buffer instance
     */
    public static createTextBufferFromArrays(position: Float32Array, color: Float32Array, size: Float32Array, text: string[],
        params: Partial<TextBufferParameters> = this.defaultTextBufferParams): Buffer {
        return new TextBuffer(Object.assign({}, {
            'position': position,
            'color': color,
            'size': size,
            'text': text
        }), Object.assign(params, {}));
    }

    private static createTubeRibbonCommon(pathElemPositions: Vector3[], pathElemSizes: number[], pathElemColors: Vector3[],
        interpolationSubdivisions: number = 1,
        returnCallback: (posArray: Float32Array, normArray: Float32Array, tangArray: Float32Array,
            binormArray: Float32Array, colArray: Float32Array, sizeArray: Float32Array) => Buffer): Buffer {
        if (Debug && (pathElemPositions.length != pathElemSizes.length || pathElemPositions.length != pathElemColors.length)) {
            console.error("Invalid input arguments! Following arrays must have the same length: ",
                pathElemPositions, pathElemSizes, pathElemColors);
        }

        const interpolationSpline = new HermitSpline(pathElemPositions, interpolationSubdivisions);

        const interpolPoints: Vector3[] = interpolationSpline.points;
        const interpolNormals: Vector3[] = interpolationSpline.normals;
        const interpolTangents: Vector3[] = interpolationSpline.tangents;
        const interpolBinormals: Vector3[] = [];
        const interpolColors: Vector3[] = [];
        const interpolSizes: number[] = [];

        for (let i = 0; i < interpolNormals.length; ++i) {
            interpolBinormals.push(interpolNormals[i].clone().cross(interpolTangents[i]));
        }

        for (let i = 0; i < pathElemPositions.length - 1; ++i) {
            for (let j = 0; j < interpolationSubdivisions + 2; ++j) {
                const t = j / (interpolationSubdivisions + 1);
                interpolColors.push(pathElemColors[i].clone().lerp(pathElemColors[i + 1], t));
                interpolSizes.push(pathElemSizes[i] * t + pathElemSizes[i + 1] * (1 - t));
            }
        }

        const posArray = new Float32Array(interpolPoints.length * 3);
        const normArray = new Float32Array(interpolPoints.length * 3);
        const tangArray = new Float32Array(interpolPoints.length * 3);
        const binormArray = new Float32Array(interpolPoints.length * 3);
        const colArray = new Float32Array(interpolPoints.length * 3);
        const sizeArray = new Float32Array(interpolSizes);

        for (let i = 0; i < interpolPoints.length; ++i) {
            posArray[3 * i] = interpolPoints[i].x;
            posArray[3 * i + 1] = interpolPoints[i].y;
            posArray[3 * i + 2] = interpolPoints[i].z;

            normArray[3 * i] = interpolNormals[i].x;
            normArray[3 * i + 1] = interpolNormals[i].y;
            normArray[3 * i + 2] = interpolNormals[i].z;

            tangArray[3 * i] = interpolTangents[i].x;
            tangArray[3 * i + 1] = interpolTangents[i].y;
            tangArray[3 * i + 2] = interpolTangents[i].z;

            binormArray[3 * i] = interpolBinormals[i].x;
            binormArray[3 * i + 1] = interpolBinormals[i].y;
            binormArray[3 * i + 2] = interpolBinormals[i].z;

            colArray[3 * i] = interpolColors[i].x;
            colArray[3 * i + 1] = interpolColors[i].y;
            colArray[3 * i + 2] = interpolColors[i].z;
        }

        return returnCallback(posArray, normArray, tangArray, binormArray, colArray, sizeArray);
    }
}

export default BufferCreator;