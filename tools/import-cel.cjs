// Production-only resizing/encoding of an imagegen-produced full-scene cel.
// Install sharp in your tooling environment; no browser runtime dependencies.
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const [source, name] = process.argv.slice(2);
if (!source || !/^[a-z0-9-]+$/.test(name || '')) throw Error('Usage: node tools/import-cel.cjs source.png cel-name');
(async () => {
  fs.mkdirSync('assets/cels/source/v2', {recursive:true});
  fs.mkdirSync('assets/cels/inbetweens', {recursive:true});
  fs.copyFileSync(source, path.join('assets/cels/source/v2', name + '.png'));
  await sharp(source).resize(1536,512,{fit:'fill'}).webp({quality:88}).toFile(path.join('assets/cels/inbetweens',name+'.webp'));
})();
