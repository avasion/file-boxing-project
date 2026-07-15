// characterMap.js — which voxel boxer stands in for each character in the game.
//
// The game's characters own their stats, names, records and specials; this module owns only
// their appearance. It maps a game character id onto an entry in the arena's ROSTER and builds
// it with makeBoxer. ROSTER and makeBoxer are never modified: every entry is copied before it
// is touched, so the arena modules stay exactly as authored.
//
// Player customization is data, not code: drop any of CUSTOM_FIELDS into the stored look and it
// overrides that field of the config before makeBoxer sees it. Adding a customizable field means
// adding its name to CUSTOM_FIELDS -- makeBoxer already reads all of them off the config.

import { ROSTER, makeBoxer } from './arena/npcs.js';

/** Palette fields a player may override on their own boxer. */
export const CUSTOM_FIELDS = ['skin', 'trunks', 'gloves', 'boots', 'hair', 'mask'];

const CUSTOM_KEY = 'boxing_user_look';

/**
 * Game character id -> the ROSTER entry that supplies its look.
 *   roster: entry name in ROSTER
 *   scale:  overrides that entry's own scale (USER stands at 1.0, not Kid's 0.92)
 *   custom: this character reads the stored player customization
 *   posterName: what the gym's fight card calls them, where the character id would read oddly
 */
export const CHARACTER_MODELS = {
  BLAZE:     { roster: 'Rojo' },      // red & gold, big hair
  REAPER:    { roster: 'Skull' },     // white skull mask, black suit, red gloves
  PHOENIX:   { roster: 'Gold' },      // gold gloves, black trunks
  TITAN:     { roster: 'Bear' },      // 1.12 scale, teal overalls, red gloves
  VIPER:     { roster: 'Sugar' },     // green gloves and boots, purple trunks
  KAIJU:     { roster: 'Mascara' },   // blue luchador mask, magenta gloves
  SHOCKWAVE: { roster: 'Bruiser' },   // all-magenta, full beard
  USER:      { roster: 'Kid', scale: 1.0, custom: true, posterName: 'IGNITE' }, // dark trunks, blue gloves
};

const BY_NAME = Object.fromEntries(ROSTER.map(e => [e.name, e]));

/** The player's stored look. Missing or unreadable storage just means "no overrides". */
export function loadUserCustomization() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function saveUserCustomization(look) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(look || {}));
  } catch (e) { /* storage unavailable; the default look still builds */ }
}

/**
 * The makeBoxer config for a character, as a copy with any overrides applied.
 * @param {string} id       game character id, e.g. 'BLAZE'
 * @param {object} [overrides] palette overrides; for a `custom` character these default to the
 *                             stored look, so callers do not have to know about storage.
 */
export function characterConfig(id, overrides) {
  const mapped = CHARACTER_MODELS[id];
  if (!mapped) return null;
  const base = BY_NAME[mapped.roster];
  if (!base) return null;

  const config = { ...base };                       // copy: ROSTER is left alone
  if (mapped.scale !== undefined) config.scale = mapped.scale;

  const look = overrides ?? (mapped.custom ? loadUserCustomization() : null);
  if (look) {
    for (const field of CUSTOM_FIELDS) {
      if (look[field] !== undefined) config[field] = look[field];
    }
  }
  return config;
}

/**
 * The name the gym's fight card should print for a given ROSTER entry: the character that wears
 * it, or the display name that character overrides with. Null if no character wears it.
 */
export function posterNameForRoster(rosterName) {
  const hit = Object.entries(CHARACTER_MODELS).find(([, m]) => m.roster === rosterName);
  return hit ? (hit[1].posterName ?? hit[0]) : null;
}

/**
 * Build a character's boxer. Returns a THREE.Group with userData.bones, at the arena's own
 * scale -- callers place and rescale it for whatever scene they are putting it in.
 */
export function buildCharacterModel(id, overrides) {
  const config = characterConfig(id, overrides);
  if (!config) throw new Error(`characterMap: no model mapped for character "${id}"`);
  return makeBoxer(config, config.scale ?? 1);
}
