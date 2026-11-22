// Solmar Bay — save/load. Progress lives in localStorage as v2; a v1
// save is read and upgraded instead of discarded.
export const SAVE_KEY = 'solmarbay-save-v2';
export const SAVE_KEY_V1 = 'solmarbay-save-v1';

export function saveGame(world) {
  try {
    const data = {
      version: 2,
      cash: world.cash,
      rep: world.rep,
      missionIndex: world.missionIndex,
      hasSmg: world.hasSmg,
      packages: (world.collectibles || []).filter((c) => c.taken).length,
      raceBest: world.activities.race.best,
      courierDone: world.courierDone,
      time: world.time,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

// Returns the saved data (v1 or v2) or null. Never throws.
export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
      || window.localStorage.getItem(SAVE_KEY_V1);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    // A save from a version this build does not know is not a save at all.
    if (data.version !== 1 && data.version !== 2) return null;
    if (data.version === 1) {
      return {
        version: 1,
        cash: data.cash || 0,
        rep: data.rep || 0,
        missionIndex: data.missionIndex || 0,
        hasSmg: !!data.hasSmg,
        packages: data.packages || 0,
        raceBest: null,
        courierDone: 0,
        time: 8,
      };
    }
    return data;
  } catch (err) {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(SAVE_KEY_V1);
  } catch (err) {
    // Ignore — storage may be unavailable.
  }
}
