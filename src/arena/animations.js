// animations.js — attack animations + skill unlocks for the voxel boxer rig.
//
// Works on any boxer from makeBoxer(): clips target the named joint pivots
// (Shoulder_L, Elbow_R, Hip_R, ...) via THREE.AnimationMixer, which binds
// tracks by node name inside the boxer's Group. No skinning, no retargeting.
//
// Usage:
//   import { createFighterAnimator, SKILLS, canUnlock, unlock } from './animations.js';
//   const anim = createFighterAnimator(boxer);   // one per fighter
//   anim.play('jab');                            // fire an attack
//   anim.update(dt);                             // every frame
//
// All pose values are Euler radians authored for the rig's T-pose frame
// (arms along ±X, character facing +Z). They are a solid starting point but
// were authored numerically — expect to nudge values in the POSES section
// once you see them in motion.

import * as THREE from 'three';

/* ------------------------------ poses ------------------------------ */
// Baseline fighting stance. Every keyframe merges over this, so a clip only
// has to specify the joints it moves.
export const GUARD = {
  Spine: [0.06, 0, 0],
  Head: [0.12, 0, 0],
  Shoulder_L: [0, -1.2, 0.5], Elbow_L: [0, -1.7, 0],
  Shoulder_R: [0, 1.2, -0.5], Elbow_R: [0, 1.7, 0],
  Hip_L: [-0.12, 0.1, 0], Knee_L: [0.18, 0, 0],
  Hip_R: [0.1, -0.1, 0], Knee_R: [0.14, 0, 0],
};

const HIPS_Y = 9.0; // rest height of the Hips pivot (boot+shin+thigh in npcs.js)

// Each clip: array of keyframes { t, pose:{joint:[x,y,z]}, hips:[x,y,z] }.
// pose entries override GUARD; hips is an offset from the rest position
// (z+ lunges forward, y- crouches).
const CLIP_DEFS = {
  // 1 — JAB: lead-hand snap, fastest, least damage
  jab: [
    { t: 0.00, pose: {} },
    { t: 0.10, pose: { Shoulder_L: [0, -1.55, 0.05], Elbow_L: [0, -0.15, 0], Spine: [0.06, 0.22, 0] }, hips: [0, 0, 0.8] },
    { t: 0.16, pose: { Shoulder_L: [0, -1.55, 0.05], Elbow_L: [0, -0.15, 0], Spine: [0.06, 0.22, 0] }, hips: [0, 0, 0.8] },
    { t: 0.30, pose: {} },
  ],

  // 2 — CROSS: rear straight with hip rotation
  cross: [
    { t: 0.00, pose: {} },
    { t: 0.06, pose: { Spine: [0.06, 0.15, 0] }, hips: [0, -0.3, 0] },                       // load
    { t: 0.16, pose: { Shoulder_R: [0, 1.58, -0.05], Elbow_R: [0, 0.12, 0], Spine: [0.1, -0.55, 0], Head: [0.12, -0.2, 0] }, hips: [0, -0.2, 1.4] },
    { t: 0.24, pose: { Shoulder_R: [0, 1.58, -0.05], Elbow_R: [0, 0.12, 0], Spine: [0.1, -0.55, 0] }, hips: [0, -0.2, 1.4] },
    { t: 0.42, pose: {} },
  ],

  // 3 — HOOK: lead arm stays bent, whole torso whips it across
  hook: [
    { t: 0.00, pose: {} },
    { t: 0.10, pose: { Shoulder_L: [0, -0.5, 0.35], Elbow_L: [0, -1.45, 0], Spine: [0.06, 0.55, 0] }, hips: [0, -0.2, 0] },   // wind up
    { t: 0.22, pose: { Shoulder_L: [0, -1.95, 0.1], Elbow_L: [0, -1.45, 0], Spine: [0.08, -0.45, 0], Head: [0.12, -0.25, 0] }, hips: [0, -0.15, 0.6] },
    { t: 0.30, pose: { Shoulder_L: [0, -1.95, 0.1], Elbow_L: [0, -1.45, 0], Spine: [0.08, -0.45, 0] }, hips: [0, -0.15, 0.6] },
    { t: 0.50, pose: {} },
  ],

  // 4 — UPPERCUT: rear glove drops then drives up under the chin
  uppercut: [
    { t: 0.00, pose: {} },
    { t: 0.12, pose: { Shoulder_R: [0, 1.45, -1.05], Elbow_R: [0, 1.5, 0], Spine: [0.35, -0.15, 0] }, hips: [0, -1.1, 0] },  // dip + load
    { t: 0.26, pose: { Shoulder_R: [0, 1.5, 0.55], Elbow_R: [0, 1.35, 0], Spine: [-0.18, -0.3, 0], Head: [-0.05, 0, 0] }, hips: [0, 0.3, 1.0] },
    { t: 0.34, pose: { Shoulder_R: [0, 1.5, 0.55], Elbow_R: [0, 1.35, 0], Spine: [-0.18, -0.3, 0] }, hips: [0, 0.3, 1.0] },
    { t: 0.55, pose: {} },
  ],

  // IDLE: breathing in the guard. Loops; first and last keys match so it seams.
  // Everything stays on the guard silhouette -- only the chest lifts and the gloves ride with it.
  idle: [
    { t: 0.00, pose: {}, hips: [0, 0, 0] },
    { t: 1.20, pose: { Spine: [0.10, 0, 0], Head: [0.14, 0.05, 0], Shoulder_L: [0, -1.24, 0.56], Shoulder_R: [0, 1.24, -0.56] }, hips: [0, 0.14, 0] },
    { t: 2.40, pose: {}, hips: [0, 0, 0] },
  ],

  // WALK: two full steps. Loops; first and last keys match so it seams.
  // The rig faces +Z and the legs hang down -Y, so a negative Hip x swings that leg forward and a
  // positive Knee x picks the heel up behind. Arms stay in the guard -- this is a walk to the ring,
  // not a stroll -- with the spine counter-rotating against the lead leg and the hips bobbing twice
  // per cycle, once per footfall.
  walk: [
    { t: 0.00, pose: { Hip_L: [-0.55, 0.1, 0], Knee_L: [0.15, 0, 0], Hip_R: [0.45, -0.1, 0], Knee_R: [0.55, 0, 0], Spine: [0.06, 0.09, 0] }, hips: [0, -0.18, 0] },
    { t: 0.20, pose: { Hip_L: [-0.20, 0.1, 0], Knee_L: [0.10, 0, 0], Hip_R: [0.05, -0.1, 0], Knee_R: [0.22, 0, 0], Spine: [0.06, 0, 0] }, hips: [0, 0.16, 0] },
    { t: 0.40, pose: { Hip_L: [0.45, 0.1, 0], Knee_L: [0.55, 0, 0], Hip_R: [-0.55, -0.1, 0], Knee_R: [0.15, 0, 0], Spine: [0.06, -0.09, 0] }, hips: [0, -0.18, 0] },
    { t: 0.60, pose: { Hip_L: [0.05, 0.1, 0], Knee_L: [0.22, 0, 0], Hip_R: [-0.20, -0.1, 0], Knee_R: [0.10, 0, 0], Spine: [0.06, 0, 0] }, hips: [0, 0.16, 0] },
    { t: 0.80, pose: { Hip_L: [-0.55, 0.1, 0], Knee_L: [0.15, 0, 0], Hip_R: [0.45, -0.1, 0], Knee_R: [0.55, 0, 0], Spine: [0.06, 0.09, 0] }, hips: [0, -0.18, 0] },
  ],

  // 5 — KICK: rear-leg front kick — chamber, extend, replant
  kick: [
    { t: 0.00, pose: {} },
    { t: 0.14, pose: { Hip_R: [-1.15, -0.1, 0], Knee_R: [1.35, 0, 0], Spine: [-0.2, 0, 0], Shoulder_L: [0, -1.0, 0.7], Shoulder_R: [0, 1.0, -0.7] }, hips: [0, -0.4, 0] },   // chamber
    { t: 0.26, pose: { Hip_R: [-1.55, -0.1, 0], Knee_R: [0.1, 0, 0], Ankle_R: [0.5, 0, 0], Spine: [-0.35, 0, 0], Head: [0.0, 0, 0] }, hips: [0, -0.2, 0.9] },                 // extend
    { t: 0.34, pose: { Hip_R: [-1.55, -0.1, 0], Knee_R: [0.1, 0, 0], Ankle_R: [0.5, 0, 0], Spine: [-0.35, 0, 0] }, hips: [0, -0.2, 0.9] },
    { t: 0.46, pose: { Hip_R: [-0.8, -0.1, 0], Knee_R: [1.0, 0, 0] }, hips: [0, -0.35, 0.2] },                                                                                 // retract
    { t: 0.62, pose: {} },
  ],
};

/* --------------------------- clip building --------------------------- */
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

function buildClip(name, keys) {
  const joints = new Set(Object.keys(GUARD));
  keys.forEach((k) => Object.keys(k.pose).forEach((j) => joints.add(j)));

  const tracks = [];
  for (const joint of joints) {
    const times = [], values = [];
    for (const k of keys) {
      const eul = k.pose[joint] ?? GUARD[joint] ?? [0, 0, 0];
      _q.setFromEuler(_e.set(eul[0], eul[1], eul[2]));
      times.push(k.t);
      values.push(_q.x, _q.y, _q.z, _q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${joint}.quaternion`, times, values));
  }
  if (keys.some((k) => k.hips)) {
    const times = [], values = [];
    for (const k of keys) {
      const off = k.hips ?? [0, 0, 0];
      times.push(k.t);
      values.push(off[0], HIPS_Y + off[1], off[2]);
    }
    tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, values));
  }
  return new THREE.AnimationClip(name, keys[keys.length - 1].t, tracks);
}

export const CLIPS = Object.entries(CLIP_DEFS).map(([name, keys]) => buildClip(name, keys));

/* ---------------------------- animator ---------------------------- */
/** One animator per fighter. play() returns the action so callers can time
 *  hit windows off action.time if needed. */
/** Clips that run until stopped, rather than firing once and settling back into the guard. */
export const LOOPING = new Set(['idle', 'walk']);

export function createFighterAnimator(boxer) {
  const mixer = new THREE.AnimationMixer(boxer);
  const actions = {};
  for (const clip of CLIPS) {
    const a = mixer.clipAction(clip);
    if (LOOPING.has(clip.name)) {
      a.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false; // last key returns to guard on its own
    }
    actions[clip.name] = a;
  }
  // start in the guard stance
  setPose(boxer, GUARD);

  return {
    mixer,
    actions,
    play(name, timeScale = 1) {
      const a = actions[name];
      if (!a) return null;
      a.reset();
      a.timeScale = timeScale;
      a.play();
      return a;
    },
    /** Stop a clip. A looping clip is left wherever it was, so snap back to the guard after it. */
    stop(name) {
      const a = actions[name];
      if (!a) return null;
      a.stop();
      return a;
    },
    /** Snap the rig to the guard stance — the rest pose everything else is authored against. */
    guard() { setPose(boxer, GUARD); },
    isBusy() { return Object.values(actions).some((a) => a.isRunning()); },
    update(dt) { mixer.update(dt); },
  };
}

/** Instantly apply a pose (no animation) — e.g. guard on spawn, or a
 *  frozen victory pose. */
export function setPose(boxer, pose) {
  const bones = boxer.userData.bones;
  for (const [joint, eul] of Object.entries(pose)) {
    if (bones[joint]) bones[joint].rotation.set(eul[0], eul[1], eul[2]);
  }
}

/* --------------------------- skill unlocks --------------------------- */
// Data-driven skill table keyed to the clips above. Costs use the game's
// existing special-points economy (1 KO = 5 pts) — rename ids / rebalance
// freely; nothing below is hardcoded to these values.
export const SKILLS = [
  { id: 'jab',      name: 'Jab',       clip: 'jab',      cost: 0,  damage: 4 },
  { id: 'cross',    name: 'Cross',     clip: 'cross',    cost: 0,  damage: 6 },
  { id: 'hook',     name: 'Hook',      clip: 'hook',     cost: 5,  damage: 9 },
  { id: 'uppercut', name: 'Uppercut',  clip: 'uppercut', cost: 10, damage: 12 },
  { id: 'kick',     name: 'Snap Kick', clip: 'kick',     cost: 15, damage: 16 },
];

/** record shape: { points: number, unlocked: string[] } — one per character,
 *  stored wherever the game already persists win data. */
export function unlockedSkills(record) {
  return SKILLS.filter((s) => s.cost === 0 || record.unlocked.includes(s.id));
}
export function canUnlock(record, skillId) {
  const s = SKILLS.find((k) => k.id === skillId);
  return !!s && s.cost > 0 && !record.unlocked.includes(s.id) && record.points >= s.cost;
}
export function unlock(record, skillId) {
  if (!canUnlock(record, skillId)) return false;
  record.points -= SKILLS.find((k) => k.id === skillId).cost;
  record.unlocked.push(skillId);
  return true; // caller persists the record
}
