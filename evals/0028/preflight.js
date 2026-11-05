#!/usr/bin/env node
// Spec 0028: freezes the corpus before any audit. It asks only whether each candidate answers 200;
// it reads nothing about the page. In each category, in the order listed, the first 25 that answer
// are the primary pages and the next 5 are the reserves.
//   node evals/0028/preflight.js
const fs = require('node:fs');
const path = require('node:path');

const PRIMARY = 25;
const RESERVE = 5;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const answers = async (url) => {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25000) });
    await res.body?.cancel();
    return res.status;
  } catch (err) {
    return String(err.cause?.code || err.name);
  }
};

(async () => {
  const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidates.json'), 'utf8'));
  const corpus = { frozen: new Date().toISOString(), categories: {}, rejected: [] };
  for (const [category, urls] of Object.entries(candidates)) {
    const statuses = await Promise.all(urls.map(answers));
    const ok = urls.filter((_, i) => statuses[i] === 200);
    urls.forEach((url, i) => { if (statuses[i] !== 200) corpus.rejected.push({ category, url, answer: statuses[i] }); });
    corpus.categories[category] = { primary: ok.slice(0, PRIMARY), reserve: ok.slice(PRIMARY, PRIMARY + RESERVE) };
    console.log(`${category}: ${ok.length}/${urls.length} answered; ${corpus.categories[category].primary.length} primary, ${corpus.categories[category].reserve.length} reserve`);
  }
  fs.writeFileSync(path.join(__dirname, 'corpus.json'), `${JSON.stringify(corpus, null, 2)}\n`);
  for (const r of corpus.rejected) console.log(`  rejected ${r.category} ${r.answer} ${r.url}`);
})();
