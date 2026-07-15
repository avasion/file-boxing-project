// npcs.js — the six contenders, built as riggable voxel puppets.
//
// Every boxer is a THREE.Group with a named joint hierarchy:
//
//   Root
//   └─ Hips
//      ├─ Spine ─┬─ Head (hair / mask / beard attach here)
//      │         ├─ Shoulder_L ─ Elbow_L ─ Wrist_L (glove)
//      │         └─ Shoulder_R ─ Elbow_R ─ Wrist_R (glove)
//      ├─ Hip_L ─ Knee_L ─ Ankle_L (boot)
//      └─ Hip_R ─ Knee_R ─ Ankle_R (boot)
//
// Joints are plain Groups positioned at anatomical pivots, so rotating
// e.g. bones.Shoulder_L.rotation.z swings the whole arm — ready to be
// keyframed, driven by an AnimationMixer, or swapped for a SkinnedMesh
// later. `boxer.userData.bones` maps every joint by name.
// Default pose is the T-pose from the renders.

import * as THREE from 'three';
import { voxelMesh } from './voxel.js';

/* -------- proportions (world units; player eye height is 14) -------- */
const P = {
  boot: 2.0, shin: 3.4, thigh: 3.6,          // leg = 9
  pelvisH: 2.2, chestH: 5.2,                  // torso
  headS: 4.2,
  upperArm: 3.6, foreArm: 3.0, gloveS: 2.6,
  bodyW: 5.6, bodyD: 3.2,
};

function joint(name, x, y, z) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

/**
 * Build one boxer.
 * @param {object} c colors: skin, top (null = bare), trunks, boots, gloves,
 *                   hair (null = none), mask (null), beard (null), skirt (bool)
 * @param {number} scale
 */
export function makeBoxer(c, scale = 1) {
  const root = new THREE.Group();
  root.name = `Boxer_${c.name}`;
  const bones = {};
  const legLen = P.boot + P.shin + P.thigh;

  /* Hips */
  const hips = joint('Hips', 0, legLen, 0);
  bones.Hips = hips;
  root.add(hips);
  const pelvis = voxelMesh(P.bodyW, P.pelvisH, P.bodyD, c.trunks);
  pelvis.position.y = P.pelvisH / 2;
  hips.add(pelvis);
  if (c.skirt) { // trunks flare
    const skirt = voxelMesh(P.bodyW + 0.8, 1.4, P.bodyD + 0.8, c.trunks);
    skirt.position.y = -0.2;
    hips.add(skirt);
  }

  /* Spine + chest */
  const spine = joint('Spine', 0, P.pelvisH, 0);
  bones.Spine = spine;
  hips.add(spine);
  const chest = voxelMesh(P.bodyW, P.chestH, P.bodyD, c.top ?? c.skin);
  chest.position.y = P.chestH / 2;
  spine.add(chest);
  if (c.top && c.tankStraps !== false) { // shoulders of a tank show skin
    const straps = voxelMesh(P.bodyW - 1.6, 1.2, P.bodyD + 0.2, c.skin);
    straps.position.y = P.chestH - 0.4;
    spine.add(straps);
  }
  if (c.belt) {
    const belt = voxelMesh(P.bodyW + 0.3, 0.9, P.bodyD + 0.3, c.belt);
    belt.position.y = 0.4;
    spine.add(belt);
  }

  /* Head */
  const head = joint('Head', 0, P.chestH, 0);
  bones.Head = head;
  spine.add(head);
  const skull = voxelMesh(P.headS, P.headS, P.headS, c.mask ?? c.skin);
  skull.position.y = P.headS / 2;
  head.add(skull);
  // face details on +Z
  const faceHex = parseInt((c.mask ?? c.skin).slice(1), 16);
  const faceLum = 0.3 * (faceHex >> 16) + 0.6 * ((faceHex >> 8) & 255) + 0.1 * (faceHex & 255);
  const eyeCol = faceLum > 128 ? '#1d1a14' : '#ffffff';
  const eye = (dx) => {
    const e = voxelMesh(0.7, 0.7, 0.3, eyeCol, 0);
    e.position.set(dx, P.headS * 0.62, P.bodyD / 2 + 0.55);
    head.add(e);
  };
  eye(-0.9); eye(0.9);
  if (c.mask && c.maskTrim !== false) { // luchador trim
    const trim = voxelMesh(P.headS + 0.3, 1.0, P.headS + 0.3, '#e8e2cf', 0);
    trim.position.y = 0.5;
    head.add(trim);
    const crest = voxelMesh(0.8, 1.2, P.headS * 0.7, '#e8e2cf', 0);
    crest.position.y = P.headS + 0.4;
    head.add(crest);
  }
  if (c.hair) {
    const hair = voxelMesh(P.headS + 0.6, c.hairBig ? 2.6 : 1.2, P.headS + 0.6, c.hair, 0.03);
    hair.position.y = P.headS + (c.hairBig ? 1.0 : 0.4);
    head.add(hair);
  }
  if (c.beard) {
    const beard = voxelMesh(P.headS - 0.6, 1.6, 0.8, c.beard, 0.03);
    beard.position.set(0, P.headS * 0.28, P.bodyD / 2 + 0.6);
    head.add(beard);
  }

  /* Arms — T-pose: extended straight out along ±X */
  const arm = (side) => {
    const s = side === 'L' ? 1 : -1;
    const shoulder = joint(`Shoulder_${side}`, s * (P.bodyW / 2), P.chestH - 1.2, 0);
    bones[`Shoulder_${side}`] = shoulder;
    spine.add(shoulder);

    const upper = voxelMesh(P.upperArm, 2.0, 2.0, c.sleeves ?? c.skin);
    upper.position.x = s * P.upperArm / 2;
    shoulder.add(upper);

    const elbow = joint(`Elbow_${side}`, s * P.upperArm, 0, 0);
    bones[`Elbow_${side}`] = elbow;
    shoulder.add(elbow);
    const fore = voxelMesh(P.foreArm, 1.8, 1.8, c.skin);
    fore.position.x = s * P.foreArm / 2;
    elbow.add(fore);

    const wrist = joint(`Wrist_${side}`, s * P.foreArm, 0, 0);
    bones[`Wrist_${side}`] = wrist;
    elbow.add(wrist);
    const cuff = voxelMesh(1.0, 2.1, 2.1, c.cuffs ?? '#e8e2cf');
    cuff.position.x = s * 0.4;
    wrist.add(cuff);
    const glove = voxelMesh(P.gloveS, P.gloveS, P.gloveS, c.gloves);
    glove.position.x = s * (P.gloveS / 2 + 0.7);
    wrist.add(glove);
  };
  arm('L'); arm('R');

  /* Legs */
  const leg = (side) => {
    const s = side === 'L' ? 1 : -1;
    const hip = joint(`Hip_${side}`, s * (P.bodyW / 2 - 1.3), 0, 0);
    bones[`Hip_${side}`] = hip;
    hips.add(hip);
    const thigh = voxelMesh(2.2, P.thigh, 2.4, c.trunksLong ? c.trunks : c.skin);
    thigh.position.y = -P.thigh / 2;
    hip.add(thigh);

    const knee = joint(`Knee_${side}`, 0, -P.thigh, 0);
    bones[`Knee_${side}`] = knee;
    hip.add(knee);
    const shin = voxelMesh(2.0, P.shin, 2.2, c.socks ?? c.skin);
    shin.position.y = -P.shin / 2;
    knee.add(shin);

    const ankle = joint(`Ankle_${side}`, 0, -P.shin, 0);
    bones[`Ankle_${side}`] = ankle;
    knee.add(ankle);
    const boot = voxelMesh(2.4, P.boot, 3.4, c.boots);
    boot.position.set(0, -P.boot / 2, 0.5);
    ankle.add(boot);
  };
  leg('L'); leg('R');

  root.scale.setScalar(scale);
  root.userData.bones = bones;
  root.userData.palette = c;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return root;
}

/* --------------- the roster (matched to the character sheet) --------------- */
export const ROSTER = [
  // teal overalls, blond + dark beard, red gloves & shoes
  { name: 'Bear', skin: '#e8d9a8', top: '#2ab3ba', trunks: '#1a9aa4', trunksLong: true,
    boots: '#c23a30', socks: '#e8e2cf', gloves: '#c23a30', hair: '#d9c27a',
    beard: '#3a2a1a', scale: 1.12 },
  // shirtless, purple trunks, green gloves + boots, mustachioed
  { name: 'Sugar', skin: '#b07a4a', top: null, trunks: '#8a3a7a',
    boots: '#2e7d3a', gloves: '#3aa04a', hair: '#241812', skirt: true },
  // luchador: blue/orange mask, orange-blue pants, magenta gloves, gray boots
  { name: 'Mascara', skin: '#c99a5a', top: null, trunks: '#d97a2e', trunksLong: true,
    socks: '#2a4fc9', boots: '#8a8578', gloves: '#a44a8a', mask: '#2a6ec9' },
  // dark skin, magenta gloves + trunks + shoes, full beard
  { name: 'Bruiser', skin: '#6e3a1e', top: null, trunks: '#a4387a',
    boots: '#c96a9a', gloves: '#a4387a', hair: '#241812', hairBig: true,
    beard: '#1d1408' },
  // tan, dark trunks with red trim, blue gloves, white shoes
  { name: 'Kid', skin: '#c99a5a', top: null, trunks: '#2c2f3a',
    boots: '#e8e2cf', gloves: '#2a4fc9', hair: '#141210', belt: '#b5473f', scale: 0.92 },
  // white skull mask, black suit, magenta tie band, red gloves
  { name: 'Skull', skin: '#8a8578', top: '#1d1a17', tankStraps: false,
    sleeves: '#1d1a17', trunks: '#1d1a17', trunksLong: true, socks: '#1d1a17',
    boots: '#141210', gloves: '#c23a30', mask: '#e8e2cf', maskTrim: false,
    hair: '#141210', belt: '#a4387a' },
  // brown skin, black trunks, gold gloves, white shoes
  { name: 'Gold', skin: '#7a4526', top: null, trunks: '#2c2b28',
    boots: '#e8e2cf', gloves: '#e6b52a', hair: '#141210' },
  // eighth contender for the symmetric card: red & gold, big hair
  { name: 'Rojo', skin: '#8a5a2e', top: '#c9932e', trunks: '#b5473f', trunksLong: true,
    boots: '#b5473f', socks: '#e8e2cf', gloves: '#d96a86', hair: '#241812',
    hairBig: true },
];

/* ring placement — scattered T-poses on the canvas */
const PLACEMENT = [
  { x: -18, z: -12, ry: 0.5 },
  { x: -2, z: -18, ry: 0.15 },
  { x: -6, z: 2, ry: 0.3 },
  { x: 8, z: -8, ry: -0.2 },
  { x: 4, z: 10, ry: 0.1 },
  { x: 16, z: 2, ry: -0.4 },
  { x: -14, z: 10, ry: 0.7 },
  { x: 14, z: -16, ry: -0.6 },
];

export function buildNPCs(scene, ringTop) {
  const npcs = [];
  ROSTER.forEach((c, i) => {
    const b = makeBoxer(c, c.scale ?? 1);
    const p = PLACEMENT[i];
    b.position.set(p.x, ringTop, p.z);
    b.rotation.y = p.ry;
    scene.add(b);
    npcs.push(b);
  });
  return npcs;
}

/* Example rig driver — subtle breathing so the roster reads alive without
   breaking the T-pose silhouette. Swap this for real fight animation later:
   every joint in userData.bones is ready to be keyed. */
export function idleBreath(npcs, t) {
  npcs.forEach((b, i) => {
    const k = t * 1.6 + i * 1.3;
    const bones = b.userData.bones;
    bones.Spine.rotation.x = Math.sin(k) * 0.015;
    bones.Shoulder_L.rotation.z = Math.sin(k) * 0.02;
    bones.Shoulder_R.rotation.z = -Math.sin(k) * 0.02;
    bones.Head.rotation.y = Math.sin(k * 0.5) * 0.04;
  });
}
