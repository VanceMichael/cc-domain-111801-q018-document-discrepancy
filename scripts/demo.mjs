import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceClient } from '../src/http.mjs';
import { Archive } from '../src/archive.mjs';
import { fixtureSource } from '../src/fixture-source.mjs';
import { collect } from '../src/app.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/source.json', import.meta.url), 'utf8'));
const source = await fixtureSource(fixture);

const directory = await mkdtemp(join(tmpdir(), 'document-discrepancy-'));
const archive = await new Archive(directory).start();
try {
  const result = await collect(new SourceClient(source.url), archive, fixture.scope);
  console.log(JSON.stringify(result, null, 2));
  console.log('已保存原文与收件记录：', archive.records(fixture.scope).length);
  if (!result.complete) process.exitCode = 1;
} finally { archive.close(); await source.close();  await rm(directory, { recursive: true, force: true }); }
