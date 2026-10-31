import fs from 'node:fs';
import { prisma } from '../src/config/prisma.js';

const sql = fs.readFileSync(new URL('../prisma/sql/search.sql', import.meta.url), 'utf8');
// Split on statement terminators, keeping DO $$ ... $$; blocks intact.
const statements = sql.split(/;\s*(?:\r?\n|$)/).reduce((acc, part) => {
  const last = acc[acc.length - 1];
  if (last && (last.match(/\$\$/g) || []).length % 2 === 1) acc[acc.length - 1] = `${last};\n${part}`;
  else acc.push(part);
  return acc;
}, []).map((s) => s.replace(/^--.*$/gm, '').trim()).filter(Boolean);

for (const s of statements) await prisma.$executeRawUnsafe(s);
console.log(`Applied ${statements.length} search/integrity statements.`);
await prisma.$disconnect();
