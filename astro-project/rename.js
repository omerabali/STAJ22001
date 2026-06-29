import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.astro')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    if (content.includes('Mixboard')) {
        content = content.replace(/Mixboard/g, 'Beacon');
        changed = true;
    }
    if (content.includes('mixboard.png')) {
        content = content.replace(/mixboard\.png/g, 'beacon.png');
        changed = true;
    }
    if (content.includes('MIXBOARD')) {
        content = content.replace(/MIXBOARD/g, 'BEACON');
        changed = true;
    }
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
});
