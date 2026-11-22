// Solmar Bay — saves. Version 2 of the save format, stored in localStorage.
// A version 1 save (same fields, older key) is accepted and migrated, so a
// player coming back from v1 keeps their cash, rep, missions and best time.
// Everything is guarded: no localStorage (Node, private mode) just means no
// saving, never a crash.
const KEY_V2 = 'solmar-bay-save-v2';
const KEY_V1 = 'solmar-bay-save';

function storage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    return null;
  }
  return null;
}

export function loadSave() {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(KEY_V2) || store.getItem(KEY_V1);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      version: data.version ?? 1,
      cash: typeof data.cash === 'number' ? data.cash : 200,
      rep: typeof data.rep === 'number' ? data.rep : 0,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      hasSmg: !!data.hasSmg,
      // v1 stored the best race time under `best`; v2 calls it `raceBest`.
      raceBest: typeof data.raceBest === 'number' ? data.raceBest : typeof data.best === 'number' ? data.best : null,
      packages: typeof data.packages === 'number' ? data.packages : 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(world) {
  const store = storage();
  if (!store) return;
  const data = {
    version: 2,
    cash: Math.round(world.cash),
    rep: world.rep,
    missionIndex: world.missionIndex,
    hasSmg: world.hasSmg,
    raceBest: world.activities.race.best,
    packages: world.packagesCollected,
  };
  try {
    store.setItem(KEY_V2, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the game goes on, the save is just lost.
  }
}

export function clearSave() {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(KEY_V2);
    store.removeItem(KEY_V1);
  } catch {
    // Ignore.
  }
}
