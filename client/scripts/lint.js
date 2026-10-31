// Dependency-free lint: fails on secret-looking strings and Vite-exposed secret names; the real syntax check is `vite build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(jsx?|html)$/.test(f) && files.push(p); } };
walk('src'); files.push('index.html');
let bad = 0;
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  if (/sk_(live|test)_[A-Za-z0-9]{8,}/.test(s)) { bad++; console.error(`Possible Paystack SECRET key in ${f}`); }
  if (/VITE_[A-Z_]*(SECRET|PRIVATE|API_KEY)/.test(s)) { bad++; console.error(`Secret-looking VITE_ variable in ${f}`); }
  if (/localStorage\.setItem\([^)]*(token|password)/i.test(s)) { bad++; console.error(`Token/password stored in localStorage in ${f}`); }
}
console.log(bad ? `${bad} problem(s).` : `Lint OK (${files.length} files).`); process.exit(bad ? 1 : 0);
