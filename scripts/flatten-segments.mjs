/* Next.js 16 writes the prefetch data of nested routes into folders
   (kurallar/__next.kurallar/__PAGE__.txt), but the browser asks for it with dots
   (kurallar/__next.kurallar.__PAGE__.txt). On a plain file host that is a 404 for
   every link on the page. This copies each nested file to the dotted name the
   browser asks for. Run after `next build`. */
import { copyFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'out');
let copied = 0;

/** Copies everything under a `__next.*` folder to `<folder>.<path.with.dots>` beside it. */
function flatten(folder, trail = []) {
  for (const name of readdirSync(folder)) {
    const full = path.join(folder, name);
    if (statSync(full).isDirectory()) {
      flatten(full, [...trail, name]);
    } else if (trail.length > 1) {
      const [route, ...rest] = trail;
      copyFileSync(full, path.join(route, [...rest, name].join('.')));
      copied += 1;
    }
  }
}

function walk(folder) {
  for (const name of readdirSync(folder)) {
    const full = path.join(folder, name);
    if (!statSync(full).isDirectory() || name === '_next') continue;
    // trail[0] is the route folder, trail[1] the `__next.*` folder inside it
    if (name.startsWith('__next.')) flatten(full, [folder, name]);
    else walk(full);
  }
}

walk(OUT);
console.log(`flatten-segments: ${copied} prefetch files copied to their dotted names`);
