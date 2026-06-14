import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SITE } from "../lib/site";

type BtnProps = {
  href?: string;
  to?: string;
  type?: "button" | "submit";
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function Button({ href, to, type = "button", children, variant = "primary", className = "" }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition text-sm px-6 py-3";
  const styles = {
    primary: "bg-aura-600 hover:bg-aura-500 text-white shadow-lg shadow-aura-900/30",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    ghost: "text-aura-400 hover:text-aura-300",
  }[variant];

  if (to) return <Link to={to} className={`${base} ${styles} ${className}`}>{children}</Link>;
  if (href) return <a href={href} className={`${base} ${styles} ${className}`}>{children}</a>;
  return <button type={type} className={`${base} ${styles} ${className}`}>{children}</button>;
}

export function CTA({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center rounded-3xl border border-aura-800/50 bg-gradient-to-br from-aura-950/80 to-slate-900/80 p-12 sm:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-aura-900/20 via-transparent to-transparent" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{title}</h2>
          {subtitle && <p className="text-slate-400 mb-8 max-w-lg mx-auto">{subtitle}</p>}
          <div className="flex flex-wrap justify-center gap-4">
            <Button href={`${SITE.appUrl}/register`}>14 Gün Ücretsiz Dene <ArrowRight size={16} /></Button>
            <Button href={`${SITE.appUrl}/login`} variant="secondary">Giriş Yap</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHero({ badge, title, subtitle, children }: {
  badge?: string; title: string; subtitle: string; children?: React.ReactNode;
}) {
  return (
    <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-aura-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center relative">
        {badge && (
          <span className="inline-block text-xs font-medium tracking-wider uppercase text-aura-400 bg-aura-950 border border-aura-800/60 px-4 py-1.5 rounded-full mb-6">
            {badge}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          {title}
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
