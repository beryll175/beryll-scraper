import { genericAdapter } from './generic-html.js';
import { xbanxiaAdapter } from './xbanxia.js';
import { fullNovelAdapter } from './full-novel.js';

const adapters = [
  xbanxiaAdapter,
  fullNovelAdapter,
  genericAdapter
];

export function getAdapter(url) {
  return adapters.find(adapter => adapter.matches(url)) ?? null;
}
