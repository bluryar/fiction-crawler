import fs from 'fs';

import { deflateSync, gzipSync, unzipSync } from 'zlib';

let str = fs.readFileSync('./text');

console.log(Buffer.from(str).length);

console.time('deflate');
for (let i = 0; i < 10; i++) {
  const res = deflateSync(str);
  if (i === 9) console.log(res.length);
}
console.timeEnd('deflate');

console.time('gunzip');
for (let i = 0; i < 10; i++) {
  const res2 = gzipSync(Buffer.from(str));
  if (i === 9) console.log(res2.length);
}
console.timeEnd('gunzip');

const res3 = gzipSync(Buffer.from(str));
console.log(unzipSync(Buffer.from(res3.toString())).toString());
