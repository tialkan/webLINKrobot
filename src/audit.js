import {
  start,
  load,
  publicLink,
  squeeze,
  finding,
  report,
  section,
  mapLimit,
  assertHtml,
} from "./common.js";
export function classify(attempt) {
  if (!attempt.ok) return "doğrulanamadı";
  const status = attempt.result.status;
  return [404, 410].includes(status)
    ? "kırık"
    : status >= 200 && status < 300
      ? "çalışıyor"
      : "belirsiz";
}
export function anchors(html, base) {
  const $ = load(html);
  const out = [];
  $("a[href]").each((_, el) => {
    const url = publicLink($(el).attr("href"), base);
    if (url)
      out.push({ url: url.href, text: squeeze($(el).text()).slice(0, 160) });
  });
  return out;
}
export async function auditSite(input, options = {}) {
  const { target, started, response, fetcher, signal } = await start(
    input,
    options,
  );
  assertHtml(response);
  const findings = [];
  const pages = [response];
  const homeOrigin = new URL(response.url).origin;
  const candidates = [
    ...new Set(
      anchors(response.body, response.url).map((a) => {
        const u = new URL(a.url);
        u.hash = "";
        return u.href;
      }),
    ),
  ]
    .filter(
      (u) =>
        new URL(u).origin === homeOrigin &&
        u !== response.url &&
        !/\.(pdf|png|jpe?g|zip|mp[34])$/i.test(new URL(u).pathname),
    )
    .slice(0, Math.min(3, Math.max(0, (options.maxPages ?? 4) - 1)));
  await mapLimit(candidates, async (url) => {
    const a = await fetcher(url, { signal });
    if (a.ok && /text\/html/.test(a.result.headers["content-type"] ?? ""))
      pages.push(a.result);
    else
      findings.push(
        finding(
          "PAGE-UNREAD",
          "İç sayfa okunamadı",
          url,
          a.ok ? `HTTP ${a.result.status}` : a.error,
          "Bağlantıyı ve sunucu yanıtını kontrol edin.",
          "bilgi",
        ),
      );
  });
  const refs = new Map();
  for (const page of pages)
    for (const a of anchors(page.body, page.url)) {
      const key = a.url;
      if (!refs.has(key)) refs.set(key, { ...a, from: page.url });
    }
  const limit = Math.min(40, Math.max(1, options.maxLinks ?? 24));
  const selected = [...refs.values()].slice(0, limit);
  const cache = new Map(
    pages.map((p) => [p.url, Promise.resolve({ ok: true, result: p })]),
  );
  const results = await mapLimit(selected, async (ref) => {
    const url = new URL(ref.url);
    const hash = url.hash;
    url.hash = "";
    const asset = /\.(?:pdf|zip|jpe?g|png|gif|webp|mp[34])$/i.test(
      url.pathname,
    );
    const key = url.href;
    if (!cache.has(key))
      cache.set(key, fetcher(key, { signal, method: asset ? "HEAD" : "GET" }));
    let a = await cache.get(key);
    if (asset && a.ok && [405, 501].includes(a.result.status))
      a = await fetcher(key, { signal, maxBytes: 100000 });
    let state = classify(a);
    if (
      state === "çalışıyor" &&
      hash &&
      /^text\/html/.test(a.result.headers["content-type"] ?? "")
    ) {
      let fragment;
      try {
        fragment = decodeURIComponent(hash.slice(1));
      } catch {
        fragment = hash.slice(1);
      }
      if (!/^(?:top|:~:text=)/i.test(fragment)) {
        const $ = load(a.result.body);
        const exists = $("[id],a[name]")
          .toArray()
          .some(
            (el) =>
              $(el).attr("id") === fragment || $(el).attr("name") === fragment,
          );
        if (!exists) state = "sayfa içi hedef yok";
      }
    }
    if (state === "kırık" || state === "sayfa içi hedef yok")
      findings.push(
        finding(
          "LINK-BROKEN",
          state === "kırık" ? "Kırık bağlantı" : "Sayfa içi hedef bulunamadı",
          ref.from,
          `${ref.url}: ${state}${a.ok ? ` (HTTP ${a.result.status})` : ""}`,
          "Adresi veya hedef kimliğini düzeltin; kaynak için çalışan asıl yayını bulun.",
        ),
      );
    return {
      etiket: ref.text || "Adsız bağlantı",
      deger: `${state}${a.ok ? ` · HTTP ${a.result.status}${a.result.chain.length > 1 ? ` · ${a.result.chain.length - 1} yönlendirme → ${a.result.url}` : ""}` : ` · ${a.error}`} · ${new URL(ref.url).origin === homeOrigin ? "iç" : "dış"} · bulunduğu sayfa: ${ref.from}`,
      url: ref.url,
    };
  });
  return report(
    "WebLINKrobot",
    target,
    started,
    findings,
    [
      section("Bağlantı gözlemleri", results),
      section("Kapsam", [
        {
          etiket: "Bulunan / kontrol edilen",
          deger: `${refs.size} / ${selected.length}`,
        },
        {
          etiket: "Örnekleme",
          deger:
            refs.size > selected.length
              ? "Kapsam sınırı nedeniyle tüm bağlantılar kontrol edilmedi."
              : "Bulunan bağlantılar kapsam içinde.",
        },
      ]),
    ],
    [
      "En fazla dört HTML sayfası ve 24 bağlantı (CLI'de en çok 40) incelenir.",
      "403, 429, 5xx ve ağ hataları kesin kırık bağlantı sayılmaz.",
      "Bir kaynağın açılması, atıf yapılan iddiayı desteklediğini göstermez.",
      "JavaScript ile eklenen bağlantılar ve PDF içindeki atıflar incelenmez.",
    ],
    pages.length,
  );
}
