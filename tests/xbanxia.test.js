import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,parseChapterNumber} from '../src/adapters/xbanxia.js';

test('matches Xbanxia hostnames only',()=>{
  assert.equal(matches('https://www.xbanxia.cc/books/341615.html'),true);
  assert.equal(matches('https://xbanxia.cc/books/341615.html'),true);
  assert.equal(matches('https://example.com/books/341615.html'),false);
});
test('parses Chinese chapter numbering and leaves unnumbered titles null',()=>{
  assert.equal(parseChapterNumber('第001章 雨季'),1);
  assert.equal(parseChapterNumber('第114章 落定'),114);
  assert.equal(parseChapterNumber('番外 雨季之后'),null);
});
