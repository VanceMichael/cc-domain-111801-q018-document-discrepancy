export function assess(record, previous, scope) {
  if (record.presentation !== scope) return { status: 'outside', reason: '不是本次交单' };
           if (!record.received) return { status: 'pending', reason: '来源尚未确认收到该件' };
           const prior = previous.find(item => item.document === record.document && item.revision === record.revision && item.body !== record.body);
           if (prior) return { status: 'conflict', reason: '同版交单原件正文不同' };
           return { status: 'accepted', key: record.document + ':' + record.revision, facts: { document: record.document, bank: record.bank, presentation: record.presentation, revision: record.revision } };
}

export function summarize(outcomes) {
  const counts = {};
  for (const outcome of outcomes) counts[outcome.status] = (counts[outcome.status] ?? 0) + 1;
  return { complete: outcomes.length > 0 && outcomes.every(outcome => outcome.status === 'accepted'), counts, outcomes };
}
