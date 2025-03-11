/**
 * @file Viewer Utils
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */

import {
  Vector2, Vector3, Matrix4, Points, Scene, Camera,
  Object3D, WebGLRenderer, BufferGeometry, BufferAttribute, ShaderMaterial, Color, LineSegments, Box3
} from 'three'

import { createParams } from '../utils'
import TiledRenderer from './tiled-renderer'
import { quicksortCmp } from '../math/array-utils'
import Viewer from './viewer'
import {getShader} from "../shader/shader-utils";

function _trimCanvas (canvas: HTMLCanvasElement, r: number, g: number, b: number, a: number) {
  const canvasHeight = canvas.height
  const canvasWidth = canvas.width

  const ctx = canvas.getContext('2d')!
  const pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data

  let x, y, doBreak, off

  doBreak = false
  for (y = 0; y < canvasHeight; y++) {
    for (x = 0; x < canvasWidth; x++) {
      off = (y * canvasWidth + x) * 4
      if (pixels[ off ] !== r || pixels[ off + 1 ] !== g ||
          pixels[ off + 2 ] !== b || pixels[ off + 3 ] !== a
      ) {
        doBreak = true
        break
      }
    }
    if (doBreak) {
      break
    }
  }
  const topY = y

  doBreak = false
  for (x = 0; x < canvasWidth; x++) {
    for (y = 0; y < canvasHeight; y++) {
      off = (y * canvasWidth + x) * 4
      if (pixels[ off ] !== r || pixels[ off + 1 ] !== g ||
          pixels[ off + 2 ] !== b || pixels[ off + 3 ] !== a
      ) {
        doBreak = true
        break
      }
    }
    if (doBreak) {
      break
    }
  }
  const topX = x

  doBreak = false
  for (y = canvasHeight - 1; y >= 0; y--) {
    for (x = canvasWidth - 1; x >= 0; x--) {
      off = (y * canvasWidth + x) * 4
      if (pixels[ off ] !== r || pixels[ off + 1 ] !== g ||
          pixels[ off + 2 ] !== b || pixels[ off + 3 ] !== a
      ) {
        doBreak = true
        break
      }
    }
    if (doBreak) {
      break
    }
  }
  const bottomY = y

  doBreak = false
  for (x = canvasWidth - 1; x >= 0; x--) {
    for (y = canvasHeight - 1; y >= 0; y--) {
      off = (y * canvasWidth + x) * 4
      if (pixels[ off ] !== r || pixels[ off + 1 ] !== g ||
          pixels[ off + 2 ] !== b || pixels[ off + 3 ] !== a
      ) {
        doBreak = true
        break
      }
    }
    if (doBreak) {
      break
    }
  }
  const bottomX = x

  const trimedCanvas = document.createElement('canvas')
  trimedCanvas.width = bottomX - topX
  trimedCanvas.height = bottomY - topY

  const trimedCtx = trimedCanvas.getContext('2d')!
  trimedCtx.drawImage(
    canvas,
    topX, topY,
    trimedCanvas.width, trimedCanvas.height,
    0, 0,
    trimedCanvas.width, trimedCanvas.height
  )

  return trimedCanvas
}

/**
 * Image parameter object.
 * @typedef {Object} ImageParameters - image generation parameters
 * @property {Boolean} trim - trim the image
 * @property {Integer} factor - scaling factor to apply to the viewer canvas
 * @property {Boolean} antialias - antialias the image
 * @property {Boolean} transparent - transparent image background
 */

export const ImageDefaultParameters = {
  trim: false,
  factor: 1,
  antialias: false,
  transparent: false,
  onProgress: undefined as Function|undefined
}
export type ImageParameters = typeof ImageDefaultParameters

/**
 * Make image from what is shown in a viewer canvas
 * @param  {Viewer} viewer - the viewer
 * @param  {ImageParameters} params - parameters object
 * @return {Promise} A Promise object that resolves to an image {@link Blob}.
 */
export function makeImage (viewer: Viewer, params: Partial<ImageParameters> = {}) {
  const {trim, factor, antialias, transparent} = createParams(params, ImageDefaultParameters)

  const renderer = viewer.renderer
  const camera = viewer.camera

  const originalClearAlpha = renderer.getClearAlpha()
  const backgroundColor = renderer.getClearColor()

  function setLineWidthAndPixelSize (invert = false) {
    let _factor = factor
    if (antialias) _factor *= 2
    if (invert) _factor = 1 / _factor
    viewer.scene.traverse(function (o: any) {  // TODO
      const m = o.material
      if (m && m.linewidth) {
        m.linewidth *= _factor
      }
      if (m && m.uniforms && m.uniforms.size) {
        if (m.uniforms.size.__seen === undefined) {
          m.uniforms.size.value *= _factor
          m.uniforms.size.__seen = true
        }
      }
      if (m && m.uniforms && m.uniforms.linewidth) {
        if (m.uniforms.linewidth.__seen === undefined) {
          m.uniforms.linewidth.value *= _factor
          m.uniforms.linewidth.__seen = true
        }
      }
    })
    viewer.scene.traverse(function (o: any) {  // TODO
      const m = o.material
      if (m && m.uniforms && m.uniforms.size) {
        delete m.uniforms.size.__seen
      }
      if (m && m.uniforms && m.uniforms.linewidth) {
        delete m.uniforms.linewidth.__seen
      }
    })
  }

  function trimCanvas (canvas: HTMLCanvasElement) {
    if (trim) {
      const bg = backgroundColor
      const r = transparent ? 0 : bg.r * 255
      const g = transparent ? 0 : bg.g * 255
      const b = transparent ? 0 : bg.b * 255
      const a = transparent ? 0 : 255
      return _trimCanvas(canvas, r, g, b, a)
    } else {
      return canvas
    }
  }

  function onProgress (i: number, n: number, finished: boolean) {
    if (typeof params.onProgress === 'function') {
      params.onProgress(i, n, finished)
    }
  }

  return new Promise<Blob>(function (resolve, reject) {
    const tiledRenderer = new TiledRenderer(
      renderer, camera, viewer,
      { factor, antialias, onProgress, onFinish }
    )

    renderer.setClearAlpha(transparent ? 0 : 1)
    setLineWidthAndPixelSize()
    tiledRenderer.renderAsync()

    function onFinish (i: number, n: number) {
      const canvas = trimCanvas(tiledRenderer.canvas)
      canvas.toBlob(
        function (blob) {
          renderer.setClearAlpha(originalClearAlpha)
          setLineWidthAndPixelSize(true)
          viewer.requestRender()
          onProgress(n, n, true)
          if (blob) {
            resolve(blob)
          } else {
            reject('error creating image')
          }
        },
        'image/png'
      )
    }
  })
}

const vertex = new Vector3()
const matrix = new Matrix4()
const modelViewProjectionMatrix = new Matrix4()

export function sortProjectedPosition (scene: Scene, camera: Camera) {
  // console.time( "sort" );

  scene.traverseVisible(function (o) {
    if (!(o instanceof Points) || !o.userData.buffer.parameters.sortParticles) {
      return
    }

    const attributes = (o.geometry as any).attributes  // TODO
    const n = attributes.position.count

    if (n === 0) return

    matrix.multiplyMatrices(
      camera.matrixWorldInverse, o.matrixWorld
    )
    modelViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix, matrix
    )

    let sortData, sortArray, zArray: Float32Array, cmpFn

    if (!o.userData.sortData) {
      zArray = new Float32Array(n)
      sortArray = new Uint32Array(n)
      cmpFn = function (ai: number, bi: number) {
        const a = zArray[ ai ]
        const b = zArray[ bi ]
        if (a > b) return 1
        if (a < b) return -1
        return 0
      }

      sortData = {
        __zArray: zArray,
        __sortArray: sortArray,
        __cmpFn: cmpFn
      }

      o.userData.sortData = sortData
    } else {
      sortData = o.userData.sortData
      zArray = sortData.__zArray
      sortArray = sortData.__sortArray
      cmpFn = sortData.__cmpFn
    }

    for (let i = 0; i < n; ++i) {
      vertex.fromArray(attributes.position.array, i * 3)
      vertex.applyMatrix4(modelViewProjectionMatrix)

      // negate, so that sorting order is reversed
      zArray[ i ] = -vertex.z
      sortArray[ i ] = i
    }

    quicksortCmp(sortArray, cmpFn)

    let index, indexSrc, indexDst, tmpTab

    for (let name in attributes) {
      const attr = attributes[ name ]
      const array = attr.array
      const itemSize = attr.itemSize

      if (!sortData[ name ]) {
        sortData[ name ] = new Float32Array(itemSize * n)
      }

      tmpTab = sortData[ name ]
      sortData[ name ] = array

      for (let i = 0; i < n; ++i) {
        index = sortArray[ i ]

        for (let j = 0; j < itemSize; ++j) {
          indexSrc = index * itemSize + j
          indexDst = i * itemSize + j
          tmpTab[ indexDst ] = array[ indexSrc ]
        }
      }

      attributes[ name ].array = tmpTab
      attributes[ name ].needsUpdate = true
    }
  })

    // console.timeEnd( "sort" );
}

const resolution = new Vector2()
const projectionMatrixInverse = new Matrix4()
const projectionMatrixTranspose = new Matrix4()

export function updateMaterialUniforms (group: Object3D, camera: Camera, renderer: WebGLRenderer, cDist: number, bRadius: number) {
  let size = new Vector2()
  renderer.getSize(size)
  const canvasHeight = size.height
  const pixelRatio = renderer.getPixelRatio()
  const ortho = camera.type === 'OrthographicCamera'

  resolution.set(size.width, size.height)
  projectionMatrixInverse.getInverse(camera.projectionMatrix)
  projectionMatrixTranspose.copy(camera.projectionMatrix).transpose()

  group.traverse(function (o: any) {
    const m = o.material
    if (!m) return

    const u = m.uniforms
    if (!u) return

    if (m.clipNear) {
      const nearFactor = (50 - m.clipNear) / 50
      const nearClip = cDist - (bRadius * nearFactor)
      u.clipNear.value = nearClip
    }

    if (u.canvasHeight) {
      u.canvasHeight.value = canvasHeight
    }

    if (u.resolution) {
      u.resolution.value.copy(resolution)
    }

    if (u.pixelRatio) {
      u.pixelRatio.value = pixelRatio
    }

    if (u.projectionMatrixInverse) {
      u.projectionMatrixInverse.value.copy(projectionMatrixInverse)
    }

    if (u.projectionMatrixTranspose) {
      u.projectionMatrixTranspose.value.copy(projectionMatrixTranspose)
    }

    if (u.ortho) {
      u.ortho.value = ortho
    }
  })
}

export function updateCameraUniforms (group: Object3D, camera: Camera) {
  projectionMatrixInverse.getInverse(camera.projectionMatrix)
  projectionMatrixTranspose.copy(camera.projectionMatrix).transpose()

  group.traverse(function (o: any) {
    const m = o.material
    if (!m) return

    const u = m.uniforms
    if (!u) return

    if (u.projectionMatrixInverse) {
      u.projectionMatrixInverse.value.copy(projectionMatrixInverse)
    }

    if (u.projectionMatrixTranspose) {
      u.projectionMatrixTranspose.value.copy(projectionMatrixTranspose)
    }
  })
}

// Catana additions

export function createBoundingBox(box?: Box3) {
  const indices = new Uint16Array([
    0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6,
    6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7
  ]);
  const positions = new Float32Array(8 * 3);

  const bbGeometry = new BufferGeometry();
  bbGeometry.setIndex(new BufferAttribute(indices, 1));
  bbGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  const bbMaterial = new ShaderMaterial({
    uniforms: { 'uColor': { value: new Color('skyblue') } },
    vertexShader: getShader('BasicLine.vert'),
    fragmentShader: getShader('BasicLine.frag')
  })

  const ls = new LineSegments(bbGeometry, bbMaterial);
  if (box) updateBoundingBox(ls, box);
  return ls;
}

export function updateBoundingBox(lineSegments: LineSegments, box: Box3) {
  const position = ((lineSegments.geometry as BufferGeometry).attributes as any).position  // TODO
  const array = position.array;
  const { min, max } = box;

  array[0] = max.x; array[1] = max.y; array[2] = max.z;
  array[3] = min.x; array[4] = max.y; array[5] = max.z;
  array[6] = min.x; array[7] = min.y; array[8] = max.z;
  array[9] = max.x; array[10] = min.y; array[11] = max.z;
  array[12] = max.x; array[13] = max.y; array[14] = min.z;
  array[15] = min.x; array[16] = max.y; array[17] = min.z;
  array[18] = min.x; array[19] = min.y; array[20] = min.z;
  array[21] = max.x; array[22] = min.y; array[23] = min.z;

  position.needsUpdate = true;

  if (!box.isEmpty()) {
    lineSegments.geometry.computeBoundingSphere();
  }
}