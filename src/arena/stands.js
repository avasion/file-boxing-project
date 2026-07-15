// stands.js — tiered blue stadium seating surrounding the ring, filled with
// an instanced voxel crowd. Seats are static merged voxels; spectators are
// three InstancedMeshes (torsos, heads, raised arms) so a ~450-person crowd
// costs three draw calls and can still bob and wave per-person.

import * as THREE from 'three';
import { VoxelBuilder } from './voxel.js';

export const RISER_H = 3.0;   // per-row rise — taller than the player can climb
export const ROW_D = 6.0;     // per-row depth

// Each stand: front edge, extent along its wall, row count, facing.
// Three-sided bowl — the north side stays open for the walkout, lockers,
// posters and cooler; the gym props live behind and around the stands.
// dir = outward normal (front → back). yaw faces spectators at the ring.
export const STANDS = [
  { name: 'south', axis: 'z', dir: +1, front: 50, a0: -86, a1: 86, rows: 4, yaw: Math.PI },
  { name: 'east',  axis: 'x', dir: +1, front: 54, a0: -40, a1: 40, rows: 3, yaw: -Math.PI / 2 },
  { name: 'west',  axis: 'x', dir: -1, front: -54, a0: -44, a1: 24, rows: 3, yaw: Math.PI / 2 },
];

const SEAT_BLUES = ['#2a5fa8', '#3a6ec9', '#245090', '#33639f'];
const SHIRTS = ['#b5473f', '#3a6ec9', '#caa33a', '#2e7d5b', '#e8e2cf', '#7a4a8a',
  '#1a8a90', '#c98fa4', '#8a8578', '#d9d23a', '#55524a', '#efeade'];
const SKINS = ['#8a5a2e', '#6e3a1e', '#c99a5a', '#e3c58a', '#b07a4a', '#ded6c4'];

/** World position for (stand, row, s-along-row). */
function seatPos(st, row, s) {
  const off = st.front + st.dir * (row * ROW_D + ROW_D / 2);
  const y = (row + 1) * RISER_H;
  return st.axis === 'z' ? { x: s, y, z: off } : { x: off, y, z: s };
}

/** Height of the stands at (x, z), or 0 if not on a stand. Used for collision. */
export function standHeightAt(x, z) {
  for (const st of STANDS) {
    const along = st.axis === 'z' ? x : z;
    const perp = st.axis === 'z' ? z : x;
    if (along < st.a0 || along > st.a1) continue;
    const d = (perp - st.front) * st.dir;
    if (d < -1 || d > st.rows * ROW_D) continue;
    if (d < 0) return RISER_H; // front barrier face
    const row = Math.min(st.rows - 1, Math.floor(d / ROW_D));
    return (row + 1) * RISER_H;
  }
  return 0;
}

export function buildStands(scene) {
  const v = new VoxelBuilder({ jitter: 0.05 });

  for (const st of STANDS) {
    for (let r = 0; r < st.rows; r++) {
      const h = (r + 1) * RISER_H;
      const off = st.front + st.dir * (r * ROW_D + ROW_D / 2);
      // riser platform (one long box per row — cheap and clean)
      if (st.axis === 'z') v.add((st.a0 + st.a1) / 2, h - RISER_H / 2, off, st.a1 - st.a0, RISER_H, ROW_D, '#4a4a44', { jitter: 0.03 });
      else v.add(off, h - RISER_H / 2, (st.a0 + st.a1) / 2, ROW_D, RISER_H, st.a1 - st.a0, '#4a4a44', { jitter: 0.03 });

      // seats: cushion + backrest, every 4 units, skipping a mid aisle
      const mid = (st.a0 + st.a1) / 2;
      for (let s = st.a0 + 3; s < st.a1 - 2; s += 4) {
        if (Math.abs(s - mid) < 3) continue; // aisle
        const blue = SEAT_BLUES[(Math.random() * SEAT_BLUES.length) | 0];
        const back = off + st.dir * 2.1;
        if (st.axis === 'z') {
          v.add(s, h + 0.5, off - st.dir * 0.4, 3.2, 1.0, 2.6, blue);
          v.add(s, h + 2.0, back, 3.2, 3.0, 0.8, blue);
        } else {
          v.add(off - st.dir * 0.4, h + 0.5, s, 2.6, 1.0, 3.2, blue);
          v.add(back, h + 2.0, s, 0.8, 3.0, 3.2, blue);
        }
      }
    }
    // front guard barrier (cream, like the ring apron lip)
    const bOff = st.front - st.dir * 0.8;
    if (st.axis === 'z') v.add((st.a0 + st.a1) / 2, RISER_H + 0.8, bOff, st.a1 - st.a0, 1.6, 1.6, '#c9c2ae');
    else v.add(bOff, RISER_H + 0.8, (st.a0 + st.a1) / 2, 1.6, 1.6, st.a1 - st.a0, '#c9c2ae');
    // aisle steps down the middle of each stand
    const mid = (st.a0 + st.a1) / 2;
    for (let r = 0; r < st.rows; r++) {
      const h = (r + 1) * RISER_H;
      const off = st.front + st.dir * (r * ROW_D + ROW_D / 2);
      if (st.axis === 'z') v.add(mid, h + 0.2, off, 5, 0.5, ROW_D, '#6e6a5e', { jitter: 0.02 });
      else v.add(off, h + 0.2, mid, ROW_D, 0.5, 5, '#6e6a5e', { jitter: 0.02 });
    }
  }
  v.build(scene, { castShadow: false });

  return buildCrowd(scene);
}

/* ------------------------------- crowd ------------------------------- */

function buildCrowd(scene) {
  // collect occupied seats (~80% fill)
  const folks = [];
  for (const st of STANDS) {
    const mid = (st.a0 + st.a1) / 2;
    for (let r = 0; r < st.rows; r++) {
      for (let s = st.a0 + 3; s < st.a1 - 2; s += 4) {
        if (Math.abs(s - mid) < 3) continue;
        if (Math.random() > 0.8) continue;
        const p = seatPos(st, r, s);
        folks.push({
          x: p.x + (Math.random() - 0.5) * 0.6,
          y: p.y,
          z: p.z + (Math.random() - 0.5) * 0.6,
          yaw: st.yaw + (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
          bob: 0.12 + Math.random() * 0.3,
          fan: Math.random() < 0.22, // arms-up superfan
          shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
          skin: SKINS[(Math.random() * SKINS.length) | 0],
        });
      }
    }
  }

  // standing spectators leaning on the mezzanine railing (east wall, y=34 deck)
  for (let i = 0; i < 16; i++) {
    folks.push({
      x: 83 + Math.random() * 4,
      y: 34.8,                              // torso base lands on the deck
      z: -88 + Math.random() * 66,
      yaw: -Math.PI / 2 + (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
      bob: 0.08 + Math.random() * 0.15,
      fan: Math.random() < 0.3,
      shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
      skin: SKINS[(Math.random() * SKINS.length) | 0],
    });
  }

  const n = folks.length;
  const mat = (rough = 0.9) => new THREE.MeshStandardMaterial({ roughness: rough });
  const torsos = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 3.4, 1.8), mat(), n);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), mat(), n);
  const fans = folks.filter(f => f.fan);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), mat(), fans.length * 2);
  torsos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const c = new THREE.Color();
  folks.forEach((f, i) => {
    torsos.setColorAt(i, c.set(f.shirt).multiplyScalar(0.85 + Math.random() * 0.3));
    heads.setColorAt(i, c.set(f.skin));
  });
  fans.forEach((f, i) => {
    arms.setColorAt(i * 2, c.set(f.skin));
    arms.setColorAt(i * 2 + 1, c.set(f.skin));
  });

  scene.add(torsos, heads, arms);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);

  /** call every frame — bobbing crowd, waving superfans */
  function update(t) {
    folks.forEach((f, i) => {
      const bob = Math.sin(t * 2.1 + f.phase) * f.bob;
      q.setFromEuler(e.set(0, f.yaw, 0));
      pos.set(f.x, f.y + 2.4 + bob, f.z);            // torso (seated on cushion)
      torsos.setMatrixAt(i, m.compose(pos, q, one));
      pos.set(f.x, f.y + 5.2 + bob * 1.15, f.z);     // head
      heads.setMatrixAt(i, m.compose(pos, q, one));
    });
    fans.forEach((f, i) => {
      const wave = Math.sin(t * 3.2 + f.phase);
      const bob = Math.sin(t * 2.1 + f.phase) * f.bob;
      for (const side of [-1, 1]) {
        q.setFromEuler(e.set(0, f.yaw, side * (0.35 + wave * 0.25)));
        // offset arm from torso, rotated by yaw
        pos.set(side * 1.9, 0, 0).applyQuaternion(q);
        pos.x += f.x; pos.z += f.z;
        pos.y = f.y + 5.2 + bob;
        arms.setMatrixAt(i * 2 + (side + 1) / 2, m.compose(pos, q, one));
      }
    });
    torsos.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { update, count: n };
}
