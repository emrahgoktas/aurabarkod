export const SITE = {
  name: "Aura Barkod",
  legalName: "Aura Barkod Yazılım A.Ş.",
  domain: "https://aurabarkod.com",
  tagline: "Market ve giyim mağazaları için bulut POS",
  email: "info@aurabarkod.com",
  phone: "+90 212 000 00 00",
  address: "Maslak Mah. Büyükdere Cad. No:1, Sarıyer / İstanbul",
  appUrl: import.meta.env.VITE_APP_URL || "http://localhost:5173",
};

export const NAV = [
  { to: "/ozellikler", label: "Özellikler" },
  { to: "/market", label: "Market" },
  { to: "/giyim", label: "Giyim" },
  { to: "/fiyatlandirma", label: "Fiyatlandırma" },
  { to: "/hakkimizda", label: "Hakkımızda" },
];

export const PLANS = [
  {
    id: "TRIAL",
    name: "Deneme",
    price: 0,
    period: "14 gün",
    desc: "Tüm özellikleri risksiz deneyin",
    features: ["1 şube", "5 kullanıcı", "100 ürün", "POS + raporlar", "E-posta destek"],
    cta: "Ücretsiz Başla",
    highlight: false,
  },
  {
    id: "STARTER",
    name: "Başlangıç",
    price: 499,
    period: "/ ay",
    desc: "Tek şubeli marketler için",
    features: ["1 şube", "2 kasa", "Sınırsız ürün", "Veresiye / cari", "CSV içe aktarım"],
    cta: "Başlangıç Planı",
    highlight: false,
  },
  {
    id: "PRO",
    name: "Profesyonel",
    price: 999,
    period: "/ ay",
    desc: "Büyüyen işletmeler için",
    features: ["Çoklu şube", "Kampanya yönetimi", "e-Fatura", "Logo export", "Öncelikli destek"],
    cta: "Pro'ya Geç",
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    name: "Kurumsal",
    price: 2499,
    period: "/ ay",
    desc: "Zincir market ve franchise",
    features: ["Sınırsız şube", "API erişimi", "Özel SLA", "Dedicated destek", "Özel entegrasyon"],
    cta: "İletişime Geç",
    highlight: false,
  },
];
