import { text, decimal } from './validation.mjs';

export function interpret(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('来源记录不是对象');
  if (typeof raw.received !== 'boolean') throw new Error('交单收件状态无效');
           return { document: text(raw.document, 'document'), presentation: text(raw.presentation, 'presentation'), bank: text(raw.bank, 'bank'), kind: text(raw.kind, 'kind'), revision: text(raw.revision, 'revision'), body: text(raw.body, 'body'), received: raw.received };
}
