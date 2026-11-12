import { useEffect, useMemo, useState } from "react";
import { Printer, Save, Eye, Usb } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { api } from "../lib/api";
import {
  type ReceiptSettings,
  type PaperWidth,
  type FontScale,
  type PrinterConnection,
  PAPER_SPECS,
  generateReceiptHtml,
  cacheReceiptSettings,
  printReceipt,
  DEFAULT_RECEIPT_SETTINGS,
} from "../lib/printReceipt";
import {
  supportsWebSerial,
  connectSerialPrinter,
  buildEscPosReceipt,
  downloadEscPosFile,
  getPrinterProfileLabel,
  PRINTER_PROFILES,
} from "../lib/escpos";
import type { CartItem } from "../lib/shared";

const SAMPLE_ITEMS: CartItem[] = [
  { productId: "1", name: "Ekmek", quantity: 2, unitPrice: 15, discount: 0, taxRate: 1, total: 30 },
  { productId: "2", name: "Süt 1L", quantity: 1, unitPrice: 45, discount: 0, taxRate: 1, total: 45 },
];

const empty: ReceiptSettings = { ...DEFAULT_RECEIPT_SETTINGS, storeName: "" };

export default function ReceiptSettingsPage() {
  const [form, setForm] = useState<ReceiptSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialMsg, setSerialMsg] = useState("");

  useEffect(() => {
    api<ReceiptSettings>("/receipt/settings")
      .then((s) => { setForm({ ...DEFAULT_RECEIPT_SETTINGS, ...s }); cacheReceiptSettings({ ...DEFAULT_RECEIPT_SETTINGS, ...s }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const previewHtml = useMemo(() => generateReceiptHtml(form, {
    receiptNo: "RÖNIZLEME-001",
    items: SAMPLE_ITEMS,
    subtotal: 75,
    tax: 0.75,
    total: 75.75,
    paymentMethod: "CASH",
    cashierName: "Ayşe Demir",
    createdAt: new Date(),
  }), [form]);

  function set<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError("");
    setMessage("");
    if (!form.storeName.trim()) { setError("Mağaza adı zorunlu"); return; }
    try {
      const saved = await api<ReceiptSettings>("/receipt/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      cacheReceiptSettings(saved);
      setForm(saved);
      setMessage("Fiş ayarları kaydedildi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    }
  }

  function testPrint() {
    printReceipt({ ...form, autoPrint: true }, {
      receiptNo: "TEST-001",
      items: SAMPLE_ITEMS,
      subtotal: 75,
      tax: 0.75,
      total: 75.75,
      paymentMethod: "CASH",
      cashierName: "Test Kasiyer",
    });
  }

  async function connectUsb() {
    setSerialMsg("");
    try {
      await connectSerialPrinter();
      setSerialConnected(true);
      setSerialMsg("USB yazıcı bağlandı");
    } catch (e) {
      setSerialMsg(e instanceof Error ? e.message : "Bağlantı başarısız");
    }
  }

  function downloadEscPosTest() {
    const bytes = buildEscPosReceipt(form, {
      receiptNo: "TEST-ESC",
      items: SAMPLE_ITEMS,
      subtotal: 75,
      tax: 0.75,
      total: 75.75,
      paymentMethod: "CASH",
      cashierName: "Test Kasiyer",
    });
    downloadEscPosFile(bytes, "test-fis.bin");
    setSerialMsg("ESC/POS dosyası indirildi — yazıcı yazılımına aktarabilirsiniz");
  }

  const profileLabel = form.printerBrand ? getPrinterProfileLabel(form) : null;

  if (loading) {
    return <AdminLayout title="Fiş Ayarları"><div className="text-slate-400 py-20 text-center">Yükleniyor...</div></AdminLayout>;
  }

  return (
    <AdminLayout title="Fiş Ayarları">
      <p className="text-slate-400 text-sm mb-6">
        Termal yazıcı aldığınızda marka/model bilgisini buraya girin. Kağıt genişliği fiş düzenini otomatik ayarlar.
      </p>

      {message && <div className="bg-teal-900/30 text-teal-300 rounded-lg p-3 mb-4 text-sm">{message}</div>}
      {error && <div className="bg-red-900/30 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Section title="Mağaza Bilgileri">
            <Field label="Mağaza Adı *" value={form.storeName} onChange={(v) => set("storeName", v)} />
            <Field label="Adres" value={form.address || ""} onChange={(v) => set("address", v)} />
            <Field label="Telefon" value={form.phone || ""} onChange={(v) => set("phone", v)} />
            <Field label="E-posta" value={form.email || ""} onChange={(v) => set("email", v)} />
            <Field label="Web sitesi" value={form.website || ""} onChange={(v) => set("website", v)} />
          </Section>

          <Section title="Vergi Bilgileri">
            <Field label="Vergi No (VKN)" value={form.taxNumber || ""} onChange={(v) => set("taxNumber", v)} />
            <Field label="Vergi Dairesi" value={form.taxOffice || ""} onChange={(v) => set("taxOffice", v)} />
            <Field label="MERSİS No" value={form.mersisNo || ""} onChange={(v) => set("mersisNo", v)} />
          </Section>

          <Section title="Kağıt ve Yazıcı">
            <label className="block text-sm text-slate-400 mb-2">Kağıt Genişliği</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["MM_58", "MM_80"] as PaperWidth[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => set("paperWidth", w)}
                  className={`p-4 rounded-xl border text-left transition ${form.paperWidth === w ? "border-teal-500 bg-teal-900/30" : "border-slate-700 hover:border-slate-500"}`}
                >
                  <div className="font-bold">{PAPER_SPECS[w].label}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {w === "MM_58" ? "Kompakt kasa, taşınabilir" : "Market kasası (önerilen)"}
                  </div>
                  <div className={`mt-2 h-2 rounded ${w === "MM_58" ? "w-12" : "w-20"} bg-slate-600`} />
                </button>
              ))}
            </div>

            <label className="block text-sm text-slate-400 mb-2">Yazı Boyutu</label>
            <select value={form.fontScale} onChange={(e) => set("fontScale", e.target.value as FontScale)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mb-4">
              <option value="small">Küçük</option>
              <option value="normal">Normal</option>
              <option value="large">Büyük</option>
            </select>

            <Field label="Yazıcı Markası" value={form.printerBrand || ""} onChange={(v) => set("printerBrand", v)} placeholder="Örn: Epson, Bixolon, Xprinter" />
            <Field label="Yazıcı Modeli" value={form.printerModel || ""} onChange={(v) => set("printerModel", v)} placeholder="Örn: TM-T20III" />
            {profileLabel && (
              <p className="text-xs text-teal-400 -mt-1">Algılanan profil: {profileLabel}</p>
            )}
            <p className="text-xs text-slate-500 mb-2">Desteklenen: {Object.values(PRINTER_PROFILES).map((p) => p.label).join(", ")}</p>
            <label className="block text-sm text-slate-400 mb-1">Bağlantı Tipi</label>
            <select value={form.printerConnection} onChange={(e) => set("printerConnection", e.target.value as PrinterConnection)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              <option value="USB">USB</option>
              <option value="ETHERNET">Ethernet</option>
              <option value="WIFI">Wi-Fi</option>
              <option value="BLUETOOTH">Bluetooth</option>
            </select>
            {form.printerConnection === "USB" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {supportsWebSerial() && (
                  <button type="button" onClick={connectUsb} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg">
                    <Usb size={14} /> {serialConnected ? "Yazıcı Bağlı" : "USB Bağla"}
                  </button>
                )}
                <button type="button" onClick={downloadEscPosTest} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg">
                  ESC/POS İndir
                </button>
              </div>
            )}
            {serialMsg && <p className="text-xs text-slate-400 mt-2">{serialMsg}</p>}
          </Section>

          <Section title="Fiş İçeriği">
            <Field label="Alt Bilgi (teşekkür mesajı)" value={form.footerText || ""} onChange={(v) => set("footerText", v)} />
            <Toggle label="Satış sonrası otomatik yazdır" checked={form.autoPrint} onChange={(v) => set("autoPrint", v)} />
            <Toggle label="KDV / ara toplam göster" checked={form.showTaxDetails} onChange={(v) => set("showTaxDetails", v)} />
            <Toggle label="Kasiyer adını göster" checked={form.showCashierName} onChange={(v) => set("showCashierName", v)} />
          </Section>

          <div className="flex gap-3">
            <button type="button" onClick={save} className="flex-1 bg-teal-600 hover:bg-teal-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
              <Save size={18} /> Kaydet
            </button>
            <button type="button" onClick={testPrint} className="px-5 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-2 text-sm">
              <Printer size={16} /> Test Fişi
            </button>
          </div>
        </div>

        {/* Önizleme */}
        <div>
          <div className="sticky top-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <Eye size={16} /> Canlı Önizleme — {PAPER_SPECS[form.paperWidth].label}
            </div>
            <div className="bg-slate-800 rounded-xl p-6 flex justify-center min-h-[500px] border border-slate-700">
              <iframe
                title="Fiş önizleme"
                srcDoc={previewHtml}
                className="bg-white shadow-lg border-0"
                style={{
                  width: form.paperWidth === "MM_58" ? "208px" : "296px",
                  minHeight: "480px",
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Yazıcı bağlandığında aynı düzen termal kağıda basılır. Şimdilik tarayıcı üzerinden test edebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="font-semibold text-teal-400 mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-teal-500 outline-none" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-teal-500" />
    </label>
  );
}
