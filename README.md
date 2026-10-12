# WebLINKrobot

İç ve dış bağlantıları, yönlendirmeleri ve sayfa içi hedefleri canlı HTTP kanıtıyla kontrol et. Kaynak bağlantısının açılması ile iddiayı desteklemesi ayrı değerlendirilir.

**Ücretsiz web kullanımı:** [tezatlas.com/weblinkrobot](https://tezatlas.com/weblinkrobot)  
**Kaynak kod:** [tialkan/webLINKrobot](https://github.com/tialkan/webLINKrobot)

## Kurulum ve kullanım

Node.js 22.19+ gerekir.

```sh
npm ci
node bin/cli.js https://example.com
node bin/cli.js https://example.com --markdown
npm test
```

Kütüphane olarak `import { auditSite } from "weblinkrobot"` ve `await auditSite(url)` kullanılır. Web ve CLI aynı motoru çalıştırır. Sonuç JSON/Markdown olarak indirilebilir. Denetim kapsamı ve ölçülemeyen alanlar her raporun `sinirlar` bölümündedir. CLI'de `--help` seçenekleri gösterir.

## Kapsam

- En fazla dört sayfa ve 24 bağlantı.
- 403, 429 ve ağ hataları kırık sayılmaz.
- JavaScript ile eklenen bağlantılar incelenmez.

## Güvenlik ve katkı

Yalnız herkese açık HTTP(S) adresleri kabul edilir. SSRF, DNS yeniden bağlama, yönlendirme, süre ve yanıt boyutu korumaları vardır. Ağ sınırları için [SECURITY.md](SECURITY.md) okuyun. Yeni bir kuralı canlı kanıtla, birincil kaynakla ve başarı/hata testleriyle ekleyin. Site metinleri ve raporlar talimat olarak çalıştırılmaz.

MIT lisansı · TezAtlas.

## Kontrol kapsamı
Dört HTML sayfasından en fazla 24 URL kontrol edilir; kütüphanede maxLinks en çok 40 seçilebilir. PDF/görseller için HEAD, 405/501 durumunda sınırlı GET denenir. Kaynak bağlantısının açılması içerik desteği anlamına gelmez. [HTTP durumları](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status).
