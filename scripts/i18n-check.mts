/**
 * Deep-compare i18n key paths between zh-CN and en-US. Run: npx tsx scripts/i18n-check.mts
 */
import en from '../src/i18n/en-US.ts';
import zh from '../src/i18n/zh-CN.ts';

function flattenKeys(obj: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (obj === null || obj === undefined) {
    if (prefix) out.add(prefix);
    return out;
  }
  if (typeof obj !== 'object' || obj instanceof Array) {
    if (prefix) out.add(prefix);
    return out;
  }
  for (const k of Object.keys(obj as object)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = (obj as Record<string, unknown>)[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const x of flattenKeys(v, p)) out.add(x);
    } else {
      out.add(p);
    }
  }
  return out;
}

const a = flattenKeys(zh);
const b = flattenKeys(en);
const onlyZh = [...a].filter((k) => !b.has(k)).sort();
const onlyEn = [...b].filter((k) => !a.has(k)).sort();

if (onlyZh.length || onlyEn.length) {
  if (onlyZh.length) {
    console.error('Only in zh-CN:\n', onlyZh.join('\n'));
  }
  if (onlyEn.length) {
    console.error('Only in en-US:\n', onlyEn.join('\n'));
  }
  process.exit(1);
}
console.log('i18n key paths match: zh-CN and en-US');
process.exit(0);
