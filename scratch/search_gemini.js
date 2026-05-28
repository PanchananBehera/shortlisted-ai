import fs from 'fs';
import path from 'path';

const searchDir = '../server';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walkDir(fullPath));
      }
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walkDir(searchDir);
files.forEach(file => {
  if (file.endsWith('.js') || file.endsWith('.mjs')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('generative-ai') || content.includes('GEMINI_API_KEY') || content.includes('gemini') || content.includes('model')) {
      console.log(`Match in file: ${file}`);
    }
  }
});
