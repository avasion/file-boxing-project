// voxel.js — tiny MagicaVoxel-flavored construction kit.
// Every add() drops an axis-aligned box with slight per-voxel color jitter,
// then build() merges everything into one mesh per material bucket so the
// whole gym stays a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

export class VoxelBuilder {
  constructor({ jitter = 0.045, roughness = 0.9 } = {}) {
    this.jitter = jitter;
    this.roughness = roughness;
    this.geos = [];        // plain lit voxels
    this.emissiveGeos = {};// keyed by hex → glowing voxels
  }

  /**
   * Add one box.
   * @param {number} x,y,z   center position (y = center height)
   * @param {number} w,h,d   size
   * @param {number|string} color
   * @param {object} opts    { jitter, emissive }
   */
  add(x, y, z, w, h, d, color, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);

    const j = opts.jitter ?? this.jitter;
    _c.set(color);
    if (j > 0) {
      const k = 1 + (Math.random() * 2 - 1) * j;
      _c.multiplyScalar(k);
    }
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (opts.emissive) {
      const key = new THREE.Color(color).getHexString();
      (this.emissiveGeos[key] ||= []).push(g);
    } else {
      this.geos.push(g);
    }
    return this;
  }

  /** Fill a horizontal slab out of unit-ish voxels with independent jitter. */
  slab(x0, x1, y, z0, z1, thickness, color, step = 2, jitter) {
    for (let x = x0; x < x1; x += step)
      for (let z = z0; z < z1; z += step)
        this.add(x + step / 2, y, z + step / 2, step, thickness, step, color, { jitter });
    return this;
  }

  /** Vertical wall of chunky voxels in the XZ→Y plane. axis: 'x' or 'z'. */
  wall(axis, a0, a1, y0, y1, fixed, thickness, color, step = 4, jitter) {
    for (let a = a0; a < a1; a += step)
      for (let y = y0; y < y1; y += step) {
        if (axis === 'x') this.add(a + step / 2, y + step / 2, fixed, step, step, thickness, color, { jitter });
        else this.add(fixed, y + step / 2, a + step / 2, thickness, step, step, color, { jitter });
      }
    return this;
  }

  build(scene, { castShadow = false, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    if (this.geos.length) {
      const merged = mergeGeometries(this.geos, false);
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: this.roughness, metalness: 0.0,
      });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    for (const [hex, geos] of Object.entries(this.emissiveGeos)) {
      const merged = mergeGeometries(geos, false);
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: new THREE.Color('#' + hex),
        emissiveIntensity: 1.6,
        roughness: 0.6,
      });
      group.add(new THREE.Mesh(merged, mat));
    }
    scene.add(group);
    return group;
  }
}

/** Standalone jittered voxel mesh (for dynamic objects like NPC limbs). */
export function voxelMesh(w, h, d, color, jitter = 0.05) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(1 + (Math.random() * 2 - 1) * jitter),
    roughness: 0.85,
  });
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
