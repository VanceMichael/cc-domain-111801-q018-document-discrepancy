export function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('字段缺失或无效：' + name);
  return value;
}
export function decimal(value, name) {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error('十进制字段无效：' + name);
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error('数值超出范围：' + name);
  return result;
}
