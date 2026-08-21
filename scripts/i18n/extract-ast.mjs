// Static supplement to collect.mjs: pulls JSX text and prose string literals
// out of the source so strings behind conditions (quiz branches, form states,
// error messages) make it into the dictionary even if the crawler never saw them.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'components', 'App.tsx'];
const files = [];
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { if (/node_modules|vata\/dist|copy-of/.test(p)) return; fs.readdirSync(p).forEach(f => walk(path.join(p, f))); }
  else if (/\.(tsx|ts)$/.test(p) && !/\.d\.ts$|firebase|track|pageMeta\.ts|staticRoutes|devAdmin|i18n|shopify\.ts|admin\//.test(p)) files.push(p);
}
walk(ROOTS[0]); walk(ROOTS[1]); files.push(ROOTS[2]);

const out = new Set();
const isClassy = s => { const toks = s.split(/\s+/); return toks.filter(t => /^-?[a-z]+:?[a-z]*(-[\w\[\]\/\.%#(),']+)+$|^(flex|grid|block|hidden|relative|absolute|fixed|sticky|inline|uppercase|italic|truncate)$/.test(t)).length >= Math.max(2, toks.length / 2); };
const keep = s => s.length > 1 && /[a-zà-ÿ]/i.test(s) && !/^https?:|^mailto:|^tel:|^\/|^[\w.-]+@|^#|^[\w-]+$|^\$\{|^[A-Z_]+$|^[a-z]+([A-Z][a-z]+)+$|^\d/.test(s) && !isClassy(s) && !/^[a-z0-9_-]+$/i.test(s);

for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n) => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isJsxText(n)) {
      const lines = n.text.split('\n').map(l => l.trim()).filter(Boolean);
      const t = lines.join(' ');
      if (keep(t)) out.add(t);
    } else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) {
      const parent = n.parent;
      const attrName = ts.isJsxAttribute(parent) ? parent.name.getText() : null;
      const skipAttr = attrName && !/^(placeholder|title|alt|aria-label|label|description|subtitle|eyebrow|kicker|quote|caption|cta|ctaLabel|tagline|heading|hint|badge|note|text|body)$/.test(attrName);
      const isKey = ts.isPropertyAssignment(parent) && parent.name === n;
      const isImportish = ts.isCallExpression(parent) && /import|require|lazy|fetch|querySelector|getItem|setItem|addEventListener|removeEventListener|classList|getAttribute|setAttribute|createElement|matchMedia/.test(parent.expression.getText());
      const isPropAccess = ts.isElementAccessExpression(parent) || ts.isTypeNode(parent) || ts.isLiteralTypeNode(parent);
      const propKey = ts.isPropertyAssignment(parent) ? parent.name.getText() : '';
      const skipProp = /^(id|key|href|to|src|url|slug|icon|className|class|color|bg|tint|accent|type|name|value|font|image|img|video|poster|path|route|ref|tag|kind|variant|size|align|category|dosha|season|handle|sku|currency|code|lang|locale|anchor|hash|field|mode|status|role|collection|theme|bgClass|textClass|grad|gradient|fill|stroke|ease|family|weight|shadow|style)$/i.test(propKey);
      const v = n.text;
      if (!skipAttr && !isKey && !isImportish && !isPropAccess && !skipProp && keep(v) && (attrName || propKey || /\s/.test(v) || /[à-ÿ]/i.test(v))) out.add(v);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const SKIP = /^[\s\d.,:;!?%$€#()\-–·•/|&+*'"«»]*$/;
const prev = JSON.parse(fs.readFileSync('scripts/i18n/strings.fr.json', 'utf8'));
const merged = new Set(prev);
let added = 0; for (const s of out) if (!SKIP.test(s) && !merged.has(s)) { merged.add(s); added++; }
const list = [...merged].sort((a, b) => a.localeCompare(b, 'fr'));
fs.writeFileSync('scripts/i18n/strings.fr.json', JSON.stringify(list, null, 1));
console.log('files', files.length, 'ast strings', out.size, 'added', added, 'TOTAL', list.length, 'chars', list.join('').length);
