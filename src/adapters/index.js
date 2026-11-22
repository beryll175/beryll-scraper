import { genericAdapter } from './generic-html.js';
import { xbanxiaAdapter } from './xbanxia.js';

const adapters = [xbanxiaAdapter, genericAdapter];
export function getAdapter(url) {
  return adapters.find(adapter => adapter.matches(url)) ?? null;
}
