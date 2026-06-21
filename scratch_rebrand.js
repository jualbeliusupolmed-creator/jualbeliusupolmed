const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const targetDirs = [path.join(projectDir, 'src'), path.join(projectDir, 'package.json')];

const replacements = [
  { search: /Jual Beli USU Polmed/gi, replace: "Jual Beli Medan" },
  { search: /jualbeliusupolmed/gi, replace: "jualbelimedan" },
  { search: /USU\/POLMED/gi, replace: "Medan" },
  { search: /USU \& POLMED/g, replace: "Medan" },
  { search: /USU \u0026 POLMED/g, replace: "Medan" },
  { search: /USU \u0026amp; POLMED/g, replace: "Medan" },
  { search: /USU \· POLMED/g, replace: "Medan" },
  { search: /jualbeli\.usupolmed/g, replace: "jualbeli.medan" },
  { search: /jual-beli-usu-polmed/g, replace: "jual-beli-medan" },
  { search: /Universitas Sumatera Utara \& Politeknik Negeri Medan/g, replace: "Kota Medan" },
  { search: /Universitas Sumatera Utara \\&amp; Politeknik Negeri Medan/g, replace: "Kota Medan" },
  { search: /USU \/ POLMED/g, replace: "Medan" },
];

function walkSync(currentDirPath, callback) {
  if (fs.statSync(currentDirPath).isFile()) {
    callback(currentDirPath);
    return;
  }
  fs.readdirSync(currentDirPath).forEach(function (name) {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    if (stat.isFile()) {
      callback(filePath);
    } else if (stat.isDirectory()) {
      walkSync(filePath, callback);
    }
  });
}

function processFile(filePath) {
  if (!filePath.match(/\.(js|jsx|ts|tsx|json)$/)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  replacements.forEach(r => {
    content = content.replace(r.search, r.replace);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkSync(dir, processFile);
  }
});

console.log('Rebranding complete.');
