// Dependency-free lint: syntax-checks every server source file and flags leftover debug or secret patterns.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === 'node_modules') continue; statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } };
['src', 'scripts', 'prisma', 'tests'].forEach((d) => { try { walk(d); } catch { /* optional dir */ } });
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.error(`Syntax error in ${f}\n${e.stderr}`); }
  const src = readFileSync(f, 'utf8');
  if (new RegExp("\\bdebug" + "ger\\b").test(src)) { bad++; console.error(`stray debug statement in ${f}`); }
  if (/(sk_(live|test)_[A-Za-z0-9]{10,})/.test(src)) { bad++; console.error(`Possible Paystack secret in ${f}`); }
}
console.log(bad ? `${bad} problem(s) found.` : `Lint OK (${files.length} files).`);
process.exit(bad ? 1 : 0);
