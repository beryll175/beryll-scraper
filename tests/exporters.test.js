import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocx } from '../src/exporters/docx.js';
import { buildEpub } from '../src/exporters/epub.js';
import { createZip, crc32 } from '../src/exporters/zip.js';
const sample=[{title:'第001章 雨季',text:'第一段\n\n第二段 & <test>',paragraphs:['第一段','第二段 & <test>']}];
function entries(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=0;const out=[];
  while(offset+4<bytes.length&&view.getUint32(offset,true)===0x04034b50){const nameLen=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),size=view.getUint32(offset+18,true);const name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLen));const start=offset+30+nameLen+extra;out.push({name,data:bytes.slice(start,start+size)});offset=start+size;}
  return out;
}
test('ZIP writer emits valid CRC and readable stored entries',()=>{const data=new TextEncoder().encode('hello');assert.equal(crc32(data),0x3610a686);const zipped=createZip([{name:'a.txt',data:'hello'}]);const found=entries(zipped);assert.equal(found.length,1);assert.equal(new TextDecoder().decode(found[0].data),'hello');});
test('DOCX contains required OOXML parts and escaped chapter text',async()=>{const blob=buildDocx(sample,{title:'Novel',author:'Author'});assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');const files=entries(new Uint8Array(await blob.arrayBuffer()));const names=files.map(f=>f.name);assert.ok(names.includes('[Content_Types].xml'));assert.ok(names.includes('word/document.xml'));assert.ok(names.includes('docProps/core.xml'));const doc=new TextDecoder().decode(files.find(f=>f.name==='word/document.xml').data);assert.match(doc,/第二段 &amp; &lt;test&gt;/);});
test('EPUB has mimetype first, package, nav and chapter content',async()=>{const blob=buildEpub(sample,{title:'Novel',author:'Author'});assert.equal(blob.type,'application/epub+zip');const files=entries(new Uint8Array(await blob.arrayBuffer()));assert.equal(files[0].name,'mimetype');assert.equal(new TextDecoder().decode(files[0].data),'application/epub+zip');const names=files.map(f=>f.name);assert.ok(names.includes('META-INF/container.xml'));assert.ok(names.includes('OEBPS/content.opf'));assert.ok(names.includes('OEBPS/nav.xhtml'));assert.ok(names.includes('OEBPS/chapter-0001.xhtml'));});
