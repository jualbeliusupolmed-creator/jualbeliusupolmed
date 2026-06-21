const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const targetDirs = [path.join(projectDir, 'src'), path.join(projectDir, 'package.json')];

const replacements = [
  { search: /Marketplace Mahasiswa Medan/gi, replace: "Marketplace Kota Medan" },
  { search: /Marketplace mahasiswa Medan/gi, replace: "Marketplace Kota Medan" },
  { search: /Marketplace mahasiswa/gi, replace: "Marketplace" },
  { search: /mahasiswa Medan/gi, replace: "warga Medan" },
  { search: /khusus mahasiswa di Medan/gi, replace: "untuk warga Medan" },
  { search: /khusus mahasiswa/gi, replace: "untuk umum" },
  { search: /kalangan mahasiswa/gi, replace: "masyarakat umum" },
  { search: /sesama mahasiswa/gi, replace: "warga" },
  { search: /mahasiswa USU dan POLMED Medan/gi, replace: "warga Medan" },
  { search: /mahasiswa USU dan POLMED/gi, replace: "warga Medan" },
  { search: /mahasiswa Universitas Sumatera Utara(?: \&amp;)?(?: \u0026amp;)?(?: &)?(?: \u0026)? Politeknik Negeri Medan/gi, replace: "warga Kota Medan" },
  { search: /calon pembeli mahasiswa/gi, replace: "calon pembeli" },
  { search: /pembeli mahasiswa/gi, replace: "pembeli" },
  { search: /mahasiswa lain/gi, replace: "pengguna lain" },
  { search: /mahasiswa/gi, replace: "warga" }, // fallback
  { search: /Target Kampus/gi, replace: "Target Area" },
  { search: /Lokasi COD Kampus/gi, replace: "Lokasi COD" },
  { search: /di kampus/gi, replace: "di area yang disepakati" },
  { search: /wilayah kampus USU atau POLMED/gi, replace: "area publik" },
  { search: /COD kampus Medan/gi, replace: "COD Medan" },
  { search: /COD kampus/gi, replace: "COD" },
  { search: /Jasa Mahasiswa/gi, replace: "Jasa" },
  { search: /Marketplace Kampus/gi, replace: "Marketplace Kota" },
  { search: /joki tugas/gi, replace: "pekerjaan lepas" }, // since joki tugas is campus related
  { search: /buku kuliah/gi, replace: "buku" }
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

console.log('Rebranding phase 2 complete.');
