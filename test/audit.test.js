import test from "node:test";
import assert from "node:assert/strict";
const response = (
  body = "<html><body>Test</body></html>",
  status = 200,
  url = "https://example.com/",
  headers = {},
) => ({
  ok: true,
  result: {
    url,
    status,
    headers: { "content-type": "text/html", ...headers },
    body,
    bytes: Buffer.byteLength(body),
    cookies: [],
    chain: [{ url, status }],
  },
});
import { auditSite, classify } from "../src/audit.js";
test("403/429/500 and network failure are not called dead", () => {
  for (const status of [403, 429, 500])
    assert.equal(classify(response("", status)), "belirsiz");
  assert.equal(classify({ ok: false }), "doğrulanamadı");
  for (const status of [404, 410])
    assert.equal(classify(response("", status)), "kırık");
});
test("links retain source page and distinguish missing fragment", async () => {
  const fetcher = async (url) =>
    url === "https://example.com/"
      ? response(
          '<a href="#exists">Good</a><a href="#missing">Missing</a><div id="exists"></div><a href="https://source.example/dead">Source</a>',
        )
      : response("", 410, url);
  const r = await auditSite("example.com", { fetcher, maxPages: 1 });
  assert.equal(r.bulgular.length, 2);
  assert.match(r.bolumler[0].satirlar[0].deger, /çalışıyor/);
  assert.ok(r.bulgular.every((f) => f.kanit.url === "https://example.com/"));
});
