import { type Lang, LANGS, ui, type UIKey } from './ui';

export { type Lang, LANGS };

/** Interface word in the given language (falls back to English). */
export function t(lang: Lang, key: UIKey): string {
  return (ui[lang] as Record<string, string>)[key] ?? ui.en[key];
}

/** Prefix an English site path with the language: ("/research/", "fr") → "/fr/research/". */
export function localize(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') return clean;
  return clean === '/' ? '/fr/' : `/fr${clean}`;
}

/** Remove the language prefix from a pathname: "/fr/research/" → "/research/". */
export function unlocalize(pathname: string): string {
  if (pathname === '/fr' || pathname === '/fr/') return '/';
  return pathname.startsWith('/fr/') ? pathname.slice(3) : pathname;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'fr' : 'en';
}

/** Pick the right side of a { en, fr } object. */
export function pick<T>(value: { en: T; fr: T } | undefined, lang: Lang): T | undefined {
  return value ? value[lang] ?? value.en : undefined;
}

const dateFormats: Record<Lang, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', timeZone: 'UTC' }),
  fr: new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: 'short', timeZone: 'UTC' }),
};

export function formatMonth(date: Date, lang: Lang): string {
  return dateFormats[lang].format(date);
}

/** "2019 – 2024", "2024 – present", or "2021" */
export function formatSpan(start: Date, end: Date | 'ongoing' | undefined, lang: Lang): string {
  const a = start.getUTCFullYear();
  if (end === 'ongoing') return `${a} – ${t(lang, 'date.present')}`;
  if (!end) return String(a);
  const b = end.getUTCFullYear();
  return a === b ? String(a) : `${a} – ${b}`;
}
