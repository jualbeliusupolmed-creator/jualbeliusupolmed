const fs = require('fs');
const { execSync } = require('child_process');
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
let dbUrl = '';
for (let line of lines) {
  if (line.startsWith('DIRECT_URL=')) {
    dbUrl = line.substring(line.indexOf('=') + 1).replace(/"/g, '').trim();
  }
}
try {
  const result = execSync(`psql "${dbUrl}" -c "SELECT * FROM settings;"`, { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.log(e.message);
}
