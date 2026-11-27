import { genericAdapter } from './generic-html.js';
import { xbanxiaAdapter } from './xbanxia.js';
import { fullNovelAdapter } from './full-novel.js';
import { novel543Adapter } from './novel543.js';
import { hetushuAdapter } from './hetushu.js';
import { czbooksAdapter } from './czbooks.js';
import { shuku52Adapter } from './52shuku.js';
import { eightBookAdapter } from './8book.js';
const adapters=[xbanxiaAdapter,fullNovelAdapter,novel543Adapter,hetushuAdapter,czbooksAdapter,shuku52Adapter,eightBookAdapter,genericAdapter];
export function getAdapter(url){return adapters.find(adapter=>adapter.matches(url))??null;}
