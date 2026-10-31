import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

export const root = path.resolve(process.cwd(), env.storage.localDir);

export const save = async ({ key, buffer }) => {
  const file = path.join(root, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
  return { key, url: `${env.serverUrl}/uploads/${key}` };
};

export const remove = async (key) => {
  const file = path.resolve(root, key);
  if (!file.startsWith(root)) return; // never delete outside the upload dir
  await fs.rm(file, { force: true });
};
