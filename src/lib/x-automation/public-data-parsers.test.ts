import assert from "node:assert/strict";
import test from "node:test";

import { parseDifStatement } from "@/lib/fdic-dif";
import { parseFinraMarginHtml } from "@/lib/finra-margin";

test("FINRA margin statistics rows are parsed newest first", () => {
  const result = parseFinraMarginHtml(`
    <table>
      <tr><th>Month/Year</th><th>Debit Balances</th></tr>
      <tr><td>May-26</td><td>1,415,557</td></tr>
      <tr><td>Jun-26</td><td>1,502,072</td></tr>
    </table>
  `);

  assert.deepEqual(result, [
    { date: "2026-06-30", marginDebtMillionUsd: 1_502_072 },
    { date: "2026-05-31", marginDebtMillionUsd: 1_415_557 },
  ]);
});

test("FDIC DIF table returns the latest quarter balance", () => {
  const result = parseDifStatement(
    `
      <html><body>
        <h1>FDIC Quarterly Banking Profile First Quarter 2026</h1>
        <table>
          <tr><th>Quarter</th><th>DIF Reserve Ratio (%)</th><th>DIF Balance ($ Bil)</th></tr>
          <tr><td>2025 Q4</td><td>1.42</td><td>153.9</td></tr>
          <tr><td>2026 Q1</td><td>1.43</td><td>157.4</td></tr>
        </table>
      </body></html>
    `,
    "https://www.fdic.gov/example",
  );

  assert.equal(result?.date, "2026-03-31");
  assert.equal(result?.value, 157.4);
});

test("FDIC DIF prose fallback does not confuse the quarterly change with the balance", () => {
  const result = parseDifStatement(
    `
      <html><body>
        <h1>FDIC Quarterly Banking Profile Fourth Quarter 2025</h1>
        <p>The Deposit Insurance Fund (DIF) balance was $153.9 billion on December 31, 2025, up $3.7 billion.</p>
      </body></html>
    `,
    "https://www.fdic.gov/example",
  );

  assert.equal(result?.date, "2025-12-31");
  assert.equal(result?.value, 153.9);
});
