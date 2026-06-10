const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.js')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('/Users/surajkumar/Developer/TKS/frontend/src/screens');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  try {
    acorn.parse(content, { ecmaVersion: 2020, sourceType: 'module' });
  } catch (e) {
    // Acorn doesn't support JSX natively without a plugin, so let's just use babel or similar.
    // Actually, acorn doesn't support JSX out of the box.
  }
});
