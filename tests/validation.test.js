import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChapters} from '../src/core/validation.js';
test('reports numbering gaps, duplicates, failed and pending chapters without mutating records',()=>{
 const input=[{number:1,title:'One',url:'/1',status:'extracted',text:'text'},{number:1,title:'Duplicate',url:'/2',status:'error',error:'blocked'},{number:3,title:'Three',url:'/3',status:'discovered'}];
 const report=validateChapters(input);
 assert.ok(report.issues.some(x=>x.type==='duplicate-number'));
 assert.ok(report.issues.some(x=>x.type==='gap'));
 assert.ok(report.issues.some(x=>x.type==='failed'));
 assert.ok(report.issues.some(x=>x.type==='pending'));
 assert.equal(input[2].status,'discovered');
});
