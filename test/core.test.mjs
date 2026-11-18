import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SourceClient } from '../src/http.mjs';
import { fixtureSource } from '../src/fixture-source.mjs';
import { Archive } from '../src/archive.mjs';
import { interpret } from '../src/interpret.mjs';
import { assess } from '../src/receiving.mjs';
import { collect, preview } from '../src/app.mjs';

const raw = {"document": "DOC1", "presentation": "P1", "bank": "BANK-A", "kind": "invoice", "revision": "1", "received": true, "body": "合成商业单据"};
const scope = "P1";
const fixture = JSON.parse(await readFile(new URL('../fixtures/source.json', import.meta.url), 'utf8'));

test('解释来源业务字段并拒绝缺失身份', () => {
  const record = interpret(raw);
  assert.equal(record.document, raw.document);
  assert.throws(() => interpret({ ...raw, document: '' }));
  assert.throws(() => interpret(null));
  assert.throws(() => interpret([]));
});

test('范围外记录不计入当前收件', () => {
  assert.equal(assess(interpret(raw), [], scope).status, 'accepted');
  assert.equal(assess(interpret(raw), [], 'another-scope').status, 'outside');
});

test('真实来源领取与重复收件保留单份原文依据', async () => {
  const source = await fixtureSource(fixture);
  const directory = await mkdtemp(join(tmpdir(), 'receive-'));
  const archive = await new Archive(directory).start();
  try {
    const client = new SourceClient(source.url);
    const before = await preview(client);
    assert.equal(before.entries.length, 1);
    const first = await collect(client, archive, scope);
    const second = await collect(client, archive, scope);
    assert.equal(first.complete, true);
    assert.equal(second.complete, true);
    assert.equal(archive.records(scope).length, 1);
    const original = await archive.original(first.outcomes[0].digest);
    assert.deepEqual(JSON.parse(original.toString()), raw);
    assert.ok(source.accesses.some(item => item.path === "/presentation/P1/records/DOC1"));
  } finally { archive.close(); await source.close(); await rm(directory, { recursive: true, force: true }); }
});

test('来源一次暂时失败可重试，永久缺件不虚报完成', async () => {
  const source = await fixtureSource(fixture);
  const directory = await mkdtemp(join(tmpdir(), 'failures-'));
  const archive = await new Archive(directory).start();
  try {
    source.fail("/presentation/P1/records/DOC1", 503, 1);
    assert.equal((await collect(new SourceClient(source.url), archive, scope)).complete, true);
    source.replace("/presentation/P1/records/DOC1", { status: 404, body: { error: '原件暂不存在' } });
    const result = await collect(new SourceClient(source.url), archive, scope);
    assert.equal(result.complete, false);
    assert.equal(result.outcomes[0].status, 'error');
    assert.equal(archive.records(scope).length, 1);
  } finally { archive.close(); await source.close(); await rm(directory, { recursive: true, force: true }); }
});

test('目录身份与原文上下文不一致时拒绝接收', async () => {
  const source = await fixtureSource(fixture);
  const directory = await mkdtemp(join(tmpdir(), 'identity-'));
  const archive = await new Archive(directory).start();
  try {
    source.replace("/presentation/P1/records/DOC1", { body: { ...raw, presentation: 'unrelated-context' } });
    const result = await collect(new SourceClient(source.url), archive, scope);
    assert.equal(result.complete, false);
    assert.equal(archive.records(scope).length, 0);
  } finally { archive.close(); await source.close(); await rm(directory, { recursive: true, force: true }); }
});

test('重开资料库保留收据与完整性检测', async () => {
  const source = await fixtureSource(fixture);
  const directory = await mkdtemp(join(tmpdir(), 'restart-'));
  let archive = await new Archive(directory).start();
  try {
    const first = await collect(new SourceClient(source.url), archive, scope);
    archive.close(); archive = await new Archive(directory).start();
    assert.equal(archive.records(scope).length, 1);
    const digest = first.outcomes[0].digest;
    await writeFile(join(directory, 'objects', digest), '损坏内容');
    await assert.rejects(archive.original(digest), /完整性/);
    await assert.rejects(archive.original('../outside'), /摘要/);
  } finally { archive.close(); await source.close(); await rm(directory, { recursive: true, force: true }); }
});

test('限制来源边界与正文资源', async () => {
  const source = await fixtureSource(fixture);
  try {
    const client = new SourceClient(source.url, { maxBytes: 4 });
    await assert.rejects(client.get("/presentation/P1"), /限制/);
    await assert.rejects(client.get('http://outside.invalid/data'), /边界/);
    source.replace('/invalid', { bytes: '{broken-json' });
    await assert.rejects(new SourceClient(source.url).get('/invalid'));
  } finally { await source.close(); }
});

test('多个来源实例与存储实例相互隔离', async () => {
  const sources = await Promise.all([fixtureSource(fixture), fixtureSource(fixture)]);
  try {
    assert.notEqual(sources[0].url, sources[1].url);
    sources[0].replace("/presentation/P1/records/DOC1", { status: 403, body: { error: '无权领取' } });
    await assert.rejects(new SourceClient(sources[0].url).get("/presentation/P1/records/DOC1"));
    assert.equal((await new SourceClient(sources[1].url).get("/presentation/P1/records/DOC1")).raw.document, raw.document);
  } finally { await Promise.all(sources.map(source => source.close())); }
});
