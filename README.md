# Aura Barkod

Barkodlu perakende satış sistemi — market ve giyim mağazaları için production-ready POS.

## Özellikler

### P0 — Kritik
- Offline satış + senkron kuyruğu
- Otomatik bulut yedekleme
- Gün sonu Z raporu
- F1–F12 hızlı ürün kısayolları
- CSV ürün içe aktarımı

### P1 — İş Geliştirme
- e-Fatura entegrasyonu (mock + gerçek provider hazır)
- Varyant yönetimi (beden/renk)
- Kampanya motoru (%, sabit, 2 al 1 öde)
- Terazi barkod desteği (27xxxxxxxxx)
- Fiş yazdırma

### P2 — Büyüme
- Çoklu şube yönetimi
- Veresiye / cari hesap
- Sadakat puanı
- QR ödeme
- Muhasebe dışa aktarım (Logo formatı)

## Kurulum

```bash
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri
cp .env.example .env

# 3. Veritabanı (Docker)
npm run docker:up

# 4. Prisma migrate + seed
npm run db:push
npm run db:seed

# 5. Çalıştır
npm run dev
```

- **API:** http://localhost:4000
- **POS:** http://localhost:5173
- **Giriş:** admin@aurabarkod.com / admin123

## Paketler

| Paket | Hedef | Modüller |
|-------|-------|----------|
| Market | Bakkal, market | Terazi, veresiye, tedarikçi, kısayol |
| Retail | Giyim mağazası | Varyant, kampanya, sadakat, etiket |

## Mimari

```
aura-barkod/
├── apps/api/     → Fastify REST API
├── apps/pos/     → React POS (PWA + offline)
├── packages/shared/ → Ortak tipler ve iş kuralları
└── prisma/       → PostgreSQL şema
```

## Canlıya Alma Checklist

- [ ] `.env` içinde `JWT_SECRET` değiştir
- [ ] PostgreSQL production instance bağla
- [ ] `EFATURA_PROVIDER` ve API key ayarla
- [ ] HTTPS reverse proxy (nginx)
- [ ] Otomatik yedekleme cron job
- [ ] POS cihazlarında PWA kurulumu
