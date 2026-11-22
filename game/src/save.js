// Save and load: one JSON blob in localStorage with cash, reputation, mission progress,
// collectibles and the player's last position. A corrupt or absent save starts a new game.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    // Versioned saves: v1 had no version field; anything else is from the future.
    if (data.version !== undefined && data.version !== 2) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  // Shot staging never writes to the player's real save.
  if (state.shotMode) return false;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 2,
      cash: state.cash,
      rep: state.rep,
      missionIndex: state.missionIndex,
      completed: state.completed,
      collectibles: state.collectibles.filter((c) => c.taken)
        .map((c) => `${Math.round(c.x)},${Math.round(c.z)}`),
      hasSmg: state.hasSmg,
      raceBest: state.raceBest ?? null,
      courierDone: state.courierDone ?? 0,
      player: { x: state.player.x, z: state.player.z },
      time: state.time,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

/** True when a save exists to continue from. */
export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}
