import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureSource } from '../src/fixture-source.mjs';

test('来源入口可查询实际运行状态与资料位置', async () => {
  const source = await fixtureSource({ resources: { '/records': { body: [] } } }, { port: 0 });
  try {
    const response = await fetch(source.url + '/');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ready', resources: ['/records'] });
  } finally { await source.close(); }
});

test('无效监听端口不能启动来源', async () => {
  for (const port of [-1, 65536, 1.5, NaN]) {
    await assert.rejects(fixtureSource({ resources: {} }, { port }), /来源监听端口无效/);
  }
});
