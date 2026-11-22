import { createSessionStore } from './session-store.js';

export const sessionStore = createSessionStore();
export const state = {
  chapters: [],
  novel: null,
  adapterId: null,
  extraction: { running: false, paused: false, completed: 0, total: 0, errors: [] }
};
