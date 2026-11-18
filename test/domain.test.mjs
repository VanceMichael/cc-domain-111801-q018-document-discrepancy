import test from 'node:test';
import assert from 'node:assert/strict';
import { interpret } from '../src/interpret.mjs';
import { assess, summarize } from '../src/receiving.mjs';
const raw = {"document": "DOC1", "presentation": "P1", "bank": "BANK-A", "kind": "invoice", "revision": "1", "received": true, "body": "合成商业单据"};
const scope = "P1";

test('领域记录保留明确的来源上下文', () => {
  const actual = interpret(raw);
  assert.equal(actual.presentation, raw.presentation);
  assert.equal(assess(actual, [actual], scope).status, 'accepted');
});
test('同一业务依据发生矛盾时不能覆盖接收', () => {
  const first = interpret(raw);
  const changed = interpret({"document": "DOC1", "presentation": "P1", "bank": "BANK-A", "kind": "invoice", "revision": "1", "received": true, "body": "不同原文"});
  assert.equal(assess(changed, [first], scope).status, 'conflict');
});
test('空目录与范围外内容不声明完成', () => {
  assert.equal(summarize([]).complete, false);
  const outcome = assess(interpret(raw), [], 'other-scope');
  assert.equal(summarize([outcome]).complete, false);
  assert.equal(summarize([outcome]).counts.outside, 1);
});
test('缺少领域核准或接纳依据时保留待处理', () => {
  assert.notEqual(assess(interpret({"document": "DOC1", "presentation": "P1", "bank": "BANK-A", "kind": "invoice", "revision": "1", "received": false, "body": "合成商业单据"}), [], scope).status, 'accepted');
});
