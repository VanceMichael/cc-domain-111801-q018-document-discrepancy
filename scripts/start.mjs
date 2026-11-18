import { readFile } from 'node:fs/promises';
import { fixtureSource } from '../src/fixture-source.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/source.json', import.meta.url), 'utf8'));
const source = await fixtureSource(fixture);
console.log('本地合作源：' + source.url);

process.on('SIGTERM', async () => { await source.close();  });
process.on('SIGINT', async () => { await source.close();  });
