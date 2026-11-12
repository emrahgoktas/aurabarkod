import { ImageIcon } from "lucide-react";
import type { ImageSize } from "../lib/posSettings";
import { IMAGE_SIZES } from "../lib/posSettings";

export default function ProductImage({
  url,
  name,
  sizeClass,
  rounded = "rounded-lg",
}: {
  url?: string;
  name: string;
  sizeClass: string;
  rounded?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} ${rounded} object-cover bg-slate-800 shrink-0`}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div className={`${sizeClass} ${rounded} bg-slate-800 flex items-center justify-center shrink-0`}>
      <ImageIcon size={16} className="text-slate-600" />
    </div>
  );
}

export function ImageSizePicker({ value, onChange }: { value: ImageSize; onChange: (s: ImageSize) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
      {(["sm", "md", "lg"] as ImageSize[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          title={IMAGE_SIZES[s].label}
          className={`px-2 py-1 text-xs rounded-md transition ${value === s ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          {IMAGE_SIZES[s].label[0]}
        </button>
      ))}
    </div>
  );
}
