const fs = require('fs');

const idx = fs.readFileSync('index.js.original', 'utf8').split('\n');

// Kita akan cari app.get dan app.post lalu kumpulkan
let output = [];
let inRoute = false;

for (let i = 0; i < idx.length; i++) {
    const line = idx[i];
    output.push(line);
}
// This is too hard to do perfectly via regex script for a 4000 line file.
