export interface LabelProduct {
  name: string;
  barcode?: string;
  price: number | string;
  unit?: string;
}

function barcodeSvg(code: string): string {
  // Basit CODE128 benzeri çizgiler (görsel barkod)
  const bars: string[] = [];
  let x = 0;
  for (let i = 0; i < code.length; i++) {
    const n = code.charCodeAt(i);
    const w1 = (n % 3) + 1;
    const w2 = (n % 2) + 1;
    bars.push(`<rect x="${x}" y="0" width="${w1}" height="40" fill="#000"/>`);
    x += w1 + 1;
    bars.push(`<rect x="${x}" y="0" width="${w2}" height="40" fill="#000"/>`);
    x += w2 + 2;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="40">${bars.join("")}</svg>`;
}

export function printLabels(products: LabelProduct[], copies = 1) {
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;

  const labels = products.flatMap((p) =>
    Array.from({ length: copies }, () => `
      <div class="label">
        <div class="name">${p.name}</div>
        <div class="price">₺${Number(p.price).toFixed(2)}${p.unit === "kg" ? " /kg" : ""}</div>
        ${p.barcode ? `<div class="barcode-svg">${barcodeSvg(p.barcode)}</div>` : ""}
        ${p.barcode ? `<div class="barcode-text">${p.barcode}</div>` : "<div class='barcode-text'>Barkodsuz</div>"}
      </div>
    `)
  );

  win.document.write(`<!DOCTYPE html><html><head><title>Etiket Yazdır</title>
    <style>
      @page { size: 40mm 30mm; margin: 2mm; }
      body { margin: 0; font-family: Arial, sans-serif; }
      .label {
        width: 36mm; height: 26mm; padding: 2mm;
        border: 1px dashed #ccc; margin-bottom: 2mm;
        display: flex; flex-direction: column; justify-content: center;
        page-break-inside: avoid;
      }
      .name { font-size: 9px; font-weight: bold; line-height: 1.2; max-height: 2.4em; overflow: hidden; }
      .price { font-size: 14px; font-weight: bold; margin: 1mm 0; }
      .barcode-svg { height: 10mm; overflow: hidden; }
      .barcode-svg svg { height: 100%; width: auto; }
      .barcode-text { font-size: 8px; font-family: monospace; letter-spacing: 1px; }
      @media print { .label { border: none; } }
    </style>
  </head><body>${labels.join("")}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
