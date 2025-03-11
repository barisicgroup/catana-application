import { ColormakerParameters } from "../../color/colormaker";
import { BaseInterpolator, Spline, SplineIterator, SplineParameters } from "../../geometry/spline";
import RadiusFactory, { RadiusParams } from "../../utils/radius-factory";
import CgMonomerProxy from "../data_model/proxy/cg-monomer-proxy";
import { CgAminoAcidPicker } from "../picker/cg-amino-acid-picker";
import { CgMonomerPicker } from "../picker/cg-monomer-picker";
import { CgNucleotidePicker } from "../picker/cg-nucleotide-picker";
import { ColormakerRegistry } from "../../globals";
import { NumberArray } from "../../types";
import { Vector3 } from "three";
import CgPolymerView from "../data_model/views/cg-polymer-view";

/**
 * Spline iterator for coarse-grained model monomers
 */
export interface CgMonomerIterator extends SplineIterator<CgMonomerProxy> { }

/**
 * Spline interpolator designed for coarse-grained data model
 */
export class CgInterpolator extends BaseInterpolator<CgMonomerIterator, CgMonomerProxy>{
    /** @override */
    protected vectorSubdivide(interpolationFn: (v0: Vector3, v1: Vector3, v2: Vector3, v3: Vector3,
        array: Float32Array, offset: number) => void,
        iterator: CgMonomerIterator, array: Float32Array, offset: number, isCyclic: boolean): void {

        let proxies: Array<CgMonomerProxy> = new Array<CgMonomerProxy>(4);

        // [0] intentionally omitted
        proxies[1] = iterator.next();
        proxies[2] = iterator.next();
        proxies[3] = iterator.next();

        let vectors: Array<Vector3> = new Array<Vector3>(
            new Vector3(), new Vector3(),
            new Vector3(), new Vector3());

        const n = iterator.size;
        const n1 = n - 1;
        let k = offset || 0;

        for (let i = 0; i < n1; ++i) {
            proxies[0] = proxies[1];
            proxies[1] = proxies[2];
            proxies[2] = proxies[3];
            proxies[3] = iterator.next();

            this.proxiesToVectors(proxies, vectors);

            interpolationFn.apply(this, [...vectors, array, k]);
            k += 3 * this.subdiv;
        }

        if (isCyclic) {
            proxies[0] = iterator.get(n - 2);
            proxies[1] = iterator.get(n - 1);
            proxies[2] = iterator.get(0);
            proxies[3] = iterator.get(1);

            this.proxiesToVectors(proxies, vectors);

            interpolationFn.apply(this, [...vectors, array, k]);
            k += 3 * this.subdiv;
        }
    }

    /**
     * Saves positions of monomer proxies to provided vector array
     * 
     * @param proxies source proxies
     * @param vectors array of vectors where the individual positions will be saved
     */
    private proxiesToVectors(proxies: CgMonomerProxy[], vectors: Vector3[]) {
        for (let i = 0; i < proxies.length; ++i) {
            vectors[i].copy(proxies[i].position);
        }
    }
}

/**
 * Spline for interploation of coarse-grained polymers
 */
export class CgSpline implements Spline {
    private _cgPolymerView: CgPolymerView;
    private _size: number;
    private _subdiv: number;
    private _tension: number;
    private _interpolator: CgInterpolator;

    /**
     * @param cgPolymerView polymer view for which the spline should be constructed
     * @param params additional spline parameters
     */
    public constructor(cgPolymerView: CgPolymerView, params?: SplineParameters) {
        this._cgPolymerView = cgPolymerView;
        this._size = cgPolymerView.length;

        this._subdiv = params?.subdiv ?? 1;

        if (params?.tension) {
            this._tension = params.tension;
        } else {
            // Default tension value is set to the same values as in the 
            // AllAtomSpline to have consistent behavior
            this._tension = this._cgPolymerView.isNucleic() ? 0.5 : 0.9;
        }

        this._interpolator = new CgInterpolator(this._subdiv, this._tension);
    }

    /** @override */
    public getSubdividedPosition(): { position: Float32Array; } {
        return {
            position: this.getPositions()
        }
    }

    /** @override */
    public getSubdividedOrientation(): { tangent: Float32Array; normal: Float32Array; binormal: Float32Array; } {
        const tan = this.getTangents();
        const norm = this.getNormals(tan);

        return {
            tangent: tan,
            normal: norm.normal,
            binormal: norm.binormal
        }
    }

    /** @override */
    public getSubdividedColor(params?: { scheme: string, [k: string]: any } & ColormakerParameters): { color: Float32Array; } {
        return this.getSubdivCommon(3, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const col = new Float32Array(nPos);
            const iterator = this.getMonomerIterator();

            let p: any = params ?? {};

            const colormaker = ColormakerRegistry.getScheme(p);

            function colFn(item: CgMonomerProxy, array: NumberArray, offset: number) {
                colormaker.monomerColorToArray(item, array, offset);
            }

            this._interpolator.getColor(iterator, colFn, col, 0, cgPolymer.isCyclic());

            return {
                color: col
            }
        });
    }

    /** @override */
    public getSubdividedPicking(): { picking: CgMonomerPicker; } {
        return this.getSubdivCommon(1, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const iterator = this.getMonomerIterator();
            const pick = new Float32Array(nPos);
            const PickerClass = cgPolymer.isNucleic() ? CgNucleotidePicker : CgAminoAcidPicker;

            function pickFn(item: CgMonomerProxy) {
                return item.index;
            }

            this._interpolator.getPicking(iterator, pickFn,
                pick, 0, cgPolymer.isCyclic());

            return {
                picking: new PickerClass(pick, [cgPolymer.sourcePolymer], [nPos])
            }
        });
    }

    /** @override */
    public getSubdividedSize(params?: RadiusParams): { size: Float32Array; } {
        return this.getSubdivCommon(1, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const size = new Float32Array(nPos);
            const iterator = this.getMonomerIterator();
            const radiusFactory = new RadiusFactory(params);

            function sizeFn(item: CgMonomerProxy) {
                return radiusFactory.cgMonomerRadius(item);
            }

            this._interpolator.getSize(iterator, sizeFn, size,
                0, cgPolymer.isCyclic());

            return {
                size: size
            };
        });
    }

    /**
     * @returns instance of a monomer iterator related to the current polymer view
     */
    private getMonomerIterator(): CgMonomerIterator {
        const cgPolymerView = this._cgPolymerView;
        const n = this._size;

        const cache = [
            cgPolymerView.getMonomerProxyTemplate(),
            cgPolymerView.getMonomerProxyTemplate(),
            cgPolymerView.getMonomerProxyTemplate(),
            cgPolymerView.getMonomerProxyTemplate(),
        ];

        let i: number;
        let j: number;

        function get(idx: number) {
            const monProxy = cache[i++ % 4];
            if (cgPolymerView.isCyclic()) {
                monProxy.index = cgPolymerView.getProxyIndexForOffset(
                    idx < 0 ? n - 1 : (idx >= n ? 0 : idx));
            } else {
                monProxy.index = cgPolymerView.getProxyIndexForOffset(
                    idx < 0 ? 0 : (idx >= n ? n - 1 : idx));
            }
            return monProxy;
        }

        function reset() {
            i = 0;
            j = -1;
        }

        function next() {
            return get(j++);
        }

        reset();

        return {
            size: n,
            get: get,
            next: next,
            reset: reset
        }
    }

    private getPositions(): Float32Array {
        return this.getSubdivCommon(3, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const pos = new Float32Array(nPos);
            const iterator = this.getMonomerIterator();

            this._interpolator.getPosition(iterator, pos, 0, cgPolymer.isCyclic());

            return pos;
        });
    }

    private getTangents(): Float32Array {
        return this.getSubdivCommon(3, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const tan = new Float32Array(nPos);
            const iterator = this.getMonomerIterator();

            this._interpolator.getTangent(iterator, tan, 0, cgPolymer.isCyclic());

            return tan;
        });
    }

    private getNormals(tangents: Float32Array): { normal: Float32Array, binormal: Float32Array } {
        return this.getSubdivCommon(3, (sdiv: number, cgPolymer: CgPolymerView,
            n: number, nPos: number) => {
            const norm = new Float32Array(nPos);
            const bin = new Float32Array(nPos);

            // Note:
            // For amino acids, there is no reliable/meaningful option (with the current model)
            // for computation of the proper directional normal as we only have CA positions. 
            // On the other hand, this can be done for nucleotides (hydr. face. dir vector might be potentially used).
            // In any case, the current solution ignores the directional normal computation (corresponding to
            // "direction1"/"direction2" atoms usage in in the AllAtomSpline.getNormals() function).

            this._interpolator.getNormal(n, tangents, norm, bin, 0, cgPolymer.isCyclic());

            return {
                normal: norm,
                binormal: bin
            };
        });
    }

    private getSubdivCommon<T>(elementLength: number, callback: (sdiv: number, cgPolymer: CgPolymerView, n: number, nPos: number) => T): T {
        const sdiv = this._subdiv;
        const cgPolymer = this._cgPolymerView;
        const n = cgPolymer.length;
        let nPos = (n - 1) * sdiv * elementLength + elementLength;
        if (cgPolymer.isCyclic()) {
            nPos += sdiv * elementLength;
        }

        return callback(sdiv, cgPolymer, n, nPos);
    }
}