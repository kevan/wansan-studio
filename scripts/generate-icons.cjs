const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../resources/icon.png');
const OUT_ICNS = path.join(__dirname, '../resources/icon.icns');
const OUT_ICO = path.join(__dirname, '../resources/icon.ico');

console.log('Generating icons from:', INPUT);

const input = fs.readFileSync(INPUT);

// ICNS
const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (icns) {
  fs.writeFileSync(OUT_ICNS, icns);
  console.log('Created icon.icns');
} else {
  console.error('Failed to create icns');
}

// ICO
const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, false);
if (ico) {
  fs.writeFileSync(OUT_ICO, ico);
  console.log('Created icon.ico');
} else {
  console.error('Failed to create ico');
}
