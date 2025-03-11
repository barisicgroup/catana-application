import { Box3, Color, DoubleSide, Mesh, PlaneBufferGeometry, ShaderMaterial, Vector3 } from "three";

/**
 * Mesh representing the infinite "floor" grid
 * 
 * Based on the MIT-licensed Javascript code by Fyrestar https://mevedia.com (https://github.com/Fyrestar/THREE.InfiniteGridHelper)
 */
export class InfiniteGridHelper extends Mesh {
    private _boundingBox: Box3;

    public constructor(size1: number, size2: number, color: Color, distance: number, axes: string = "xzy") {
        const planeAxes: string = axes.substring(0, 2);

        const geometry = new PlaneBufferGeometry(2, 2, 1, 1);

        const material = new ShaderMaterial({
            side: DoubleSide,
            uniforms: {
                uSize1: {
                    value: size1
                },
                uSize2: {
                    value: size2
                },
                uColor: {
                    value: color
                },
                uDistance: {
                    value: distance
                }
            },
            transparent: true,
            lights: false,
            vertexShader: `
       
       varying vec3 worldPosition;
       
       uniform float uDistance;
       
       void main() {
            
            vec3 pos = position.${axes} * uDistance;
            //pos.${planeAxes} += cameraPosition.${planeAxes};
            
            worldPosition = pos;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
       
       }
       `,
            fragmentShader: `
       
       varying vec3 worldPosition;
       
       uniform float uSize1;
       uniform float uSize2;
       uniform vec3 uColor;
       uniform float uDistance;
        
        
        
        float getGrid(float size) {
        
            vec2 r = worldPosition.${planeAxes} / size;
            
            
            vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
            float line = min(grid.x, grid.y);
            
        
            return 1.0 - min(line, 1.0);
        }
        
       void main() {
       
              // Camera-based alpha does not work well now
              //float d = 1.0 - min(distance(cameraPosition.${planeAxes}, worldPosition.${planeAxes}) / uDistance, 1.0);
              float d = 1.0 - pow(length(worldPosition) / uDistance, 2.0);

              float g1 = getGrid(uSize1);
              float g2 = getGrid(uSize2);
              
              gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
              gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);
            
              if ( gl_FragColor.a <= 0.0 ) discard;
       }
       
       `,
            extensions: {
                derivatives: true
            }

        });

        super(geometry, material);

        this.frustumCulled = false;
        this._boundingBox = new Box3(new Vector3(-distance, 0, -distance), new Vector3(distance, 0, distance));
    }

    public get boundingBox(): Box3 {
        return this._boundingBox;
    }
}

export default InfiniteGridHelper;
