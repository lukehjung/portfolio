const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.overrides = {
  "postcss": "^8.5.10"
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
