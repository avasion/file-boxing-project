// ring.js — the ring, matched to the renders:
// distressed teal canvas, white posts with red turnbuckle pads,
// red + cream ropes with rope spacers, teal skirted apron, corner steps
// facing the walkout runway, and the belt table at ringside.

import * as THREE from 'three';
import { VoxelBuilder } from './voxel.js';
import { ringCanvasTexture } from './textures.js';

export const RING = {
  half: 36,       // outer platform half-size (incl. apron lip)
  ropeHalf: 28,   // post / rope line half-size
  top: 5,         // platform height players stand on
  steps: { x0: -26, x1: -10, zInner: -36, zOuter: -52 }, // faces the tunnel
};

const CREAM = '#e8e2cf';
const RED = '#b5473f';
const DARKRED = '#8a2a1c';
const TEAL = '#177582';
const TEALDARK = '#0f5a66';

export function buildRing(scene) {
  const v = new VoxelBuilder({ jitter: 0.05 });
  const { half, ropeHalf, top } = RING;

  /* ---- platform body + teal skirt panels ---- */
  v.add(0, top - 1.5, 0, half * 2, 3, half * 2, '#20211d');           // slab core
  for (let i = -half; i < half; i += 8) {                              // skirt
    v.add(i + 4, 1.6, -half + 0.6, 8, 3.2, 1.2, TEALDARK);
    v.add(i + 4, 1.6, half - 0.6, 8, 3.2, 1.2, TEALDARK);
    v.add(-half + 0.6, 1.6, i + 4, 1.2, 3.2, 8, TEALDARK);
    v.add(half - 0.6, 1.6, i + 4, 1.2, 3.2, 8, TEALDARK);
  }
  // cream apron lip ringing the top edge
  for (let i = -half; i < half; i += 6) {
    v.add(i + 3, top + 0.4, -half + 1.5, 6, 0.9, 3, CREAM);
    v.add(i + 3, top + 0.4, half - 1.5, 6, 0.9, 3, CREAM);
    v.add(-half + 1.5, top + 0.4, i + 3, 3, 0.9, 6, CREAM);
    v.add(half - 1.5, top + 0.4, i + 3, 3, 0.9, 6, CREAM);
  }

  /* ---- posts + turnbuckle pads ---- */
  const corners = [
    [-ropeHalf, -ropeHalf], [ropeHalf, -ropeHalf],
    [-ropeHalf, ropeHalf], [ropeHalf, ropeHalf],
  ];
  for (const [cx, cz] of corners) {
    v.add(cx, top + 8, cz, 2.4, 16, 2.4, CREAM);                       // post
    v.add(cx, top + 16.6, cz, 3, 1.6, 3, '#c9c2ae');                   // cap
    // red corner pad angled into the ring
    const inX = cx > 0 ? -1 : 1, inZ = cz > 0 ? -1 : 1;
    v.add(cx + inX * 1.6, top + 9.5, cz + inZ * 1.6, 3, 9, 3, RED);
    v.add(cx + inX * 1.6, top + 5.6, cz + inZ * 1.6, 3.4, 1.4, 3.4, DARKRED);
  }

  /* ---- ropes: 4 tiers; red on N/S runs, cream on E/W, with spacers ---- */
  const ropeMatRed = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.8 });
  const ropeMatCream = new THREE.MeshStandardMaterial({ color: '#d9d2bd', roughness: 0.8 });
  const ropes = new THREE.Group();
  const tiers = [3.4, 6.6, 9.8, 13.0];
  for (const t of tiers) {
    const y = top + t;
    const len = ropeHalf * 2;
    const rG = new THREE.CylinderGeometry(0.55, 0.55, len, 6);
    // north & south (red)
    for (const z of [-ropeHalf, ropeHalf]) {
      const m = new THREE.Mesh(rG, ropeMatRed);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, y, z);
      ropes.add(m);
    }
    // east & west (cream)
    for (const x of [-ropeHalf, ropeHalf]) {
      const m = new THREE.Mesh(rG, ropeMatCream);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, y, 0);
      ropes.add(m);
    }
  }
  // rope spacers (the little vertical ties midway down each side)
  for (const s of [-ropeHalf / 2, ropeHalf / 2]) {
    for (const z of [-ropeHalf, ropeHalf]) v.add(s, top + 8.2, z, 1, 11, 1.4, CREAM);
    for (const x of [-ropeHalf, ropeHalf]) v.add(x, top + 8.2, s, 1.4, 11, 1, CREAM);
  }
  scene.add(ropes);

  /* ---- canvas (the logo mat) ---- */
  const mat = new THREE.MeshStandardMaterial({ map: ringCanvasTexture(), roughness: 0.95 });
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 - 4, half * 2 - 4), mat);
  canvasMesh.rotation.x = -Math.PI / 2;
  canvasMesh.position.y = top + 0.06;
  canvasMesh.receiveShadow = true;
  scene.add(canvasMesh);

  /* ---- teal corner steps facing the tunnel ---- */
  const s = RING.steps;
  const stepCount = 4;
  const stepDepth = (s.zInner - s.zOuter) / stepCount; // negative→positive climb
  for (let i = 0; i < stepCount; i++) {
    const z = s.zOuter + stepDepth * (i + 0.5);
    const h = (top / stepCount) * (i + 1);
    v.add((s.x0 + s.x1) / 2, h / 2, z, s.x1 - s.x0, h, Math.abs(stepDepth), '#12707e');
  }
  // step side rails
  v.add(s.x0 - 0.8, 3, (s.zInner + s.zOuter) / 2, 1.4, 6, Math.abs(s.zInner - s.zOuter), '#0c515c');
  v.add(s.x1 + 0.8, 3, (s.zInner + s.zOuter) / 2, 1.4, 6, Math.abs(s.zInner - s.zOuter), '#0c515c');

  /* ---- ringside: hanging gloves + belt table (from render 4) ---- */
  v.add(ropeHalf + 1.5, top + 10.5, 10, 1.6, 2.2, 1.6, RED);   // gloves on rope
  v.add(ropeHalf + 1.5, top + 8.4, 10.8, 1.8, 2.4, 1.8, DARKRED);

  // teal table with the championship belt — ringside by the walkout
  v.add(26, 3.2, -half - 12, 20, 1.4, 8, '#12707e');
  v.add(18.5, 1.4, -half - 9, 1.4, 2.8, 1.4, '#4a4a44');
  v.add(33.5, 1.4, -half - 9, 1.4, 2.8, 1.4, '#4a4a44');
  v.add(18.5, 1.4, -half - 15, 1.4, 2.8, 1.4, '#4a4a44');
  v.add(33.5, 1.4, -half - 15, 1.4, 2.8, 1.4, '#4a4a44');
  v.add(28, 4.6, -half - 12, 9, 1.4, 4, '#caa33a');             // belt strap
  v.add(28, 5.4, -half - 12, 3.4, 1.4, 3.4, '#e6c95a');         // gold plate
  v.add(28, 5.4, -half - 12, 1.4, 1.7, 1.4, '#f4e79b');
  v.add(21.5, 4.4, -half - 11, 1.6, 1.6, 1.6, '#e8e2cf');        // water bottle
  v.add(20, 4.7, -half - 13.5, 2.6, 0.7, 2, '#d9d2bd');          // towel

  v.build(scene, { castShadow: true });
}
