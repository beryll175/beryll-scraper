const encoder = new TextEncoder();
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; }
  return table;
})();
export function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function concat(parts) { const size = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(size); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; }
function dosDateTime(date = new Date()) { return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }; }
// Minimal ZIP writer using STORE (no compression), compatible with DOCX and EPUB.
export function createZip(entries) {
  const local = [], central = []; let offset = 0; const stamp = dosDateTime();
  for (const entry of entries) {
    const name = encoder.encode(entry.name); const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data; const crc = crc32(data);
    const header = new Uint8Array(30 + name.length); const hv = new DataView(header.buffer);
    u32(hv,0,0x04034b50); u16(hv,4,20); u16(hv,6,0x0800); u16(hv,8,0); u16(hv,10,stamp.time); u16(hv,12,stamp.date); u32(hv,14,crc); u32(hv,18,data.length); u32(hv,22,data.length); u16(hv,26,name.length); u16(hv,28,0); header.set(name,30); local.push(header,data);
    const dir = new Uint8Array(46 + name.length); const dv = new DataView(dir.buffer);
    u32(dv,0,0x02014b50); u16(dv,4,20); u16(dv,6,20); u16(dv,8,0x0800); u16(dv,10,0); u16(dv,12,stamp.time); u16(dv,14,stamp.date); u32(dv,16,crc); u32(dv,20,data.length); u32(dv,24,data.length); u16(dv,28,name.length); u16(dv,30,0); u16(dv,32,0); u16(dv,34,0); u16(dv,36,0); u32(dv,38,0); u32(dv,42,offset); dir.set(name,46); central.push(dir); offset += header.length + data.length;
  }
  const centralBytes = concat(central); const localBytes = concat(local); const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  u32(ev,0,0x06054b50); u16(ev,4,0); u16(ev,6,0); u16(ev,8,entries.length); u16(ev,10,entries.length); u32(ev,12,centralBytes.length); u32(ev,16,localBytes.length); u16(ev,20,0);
  return concat([localBytes,centralBytes,end]);
}
