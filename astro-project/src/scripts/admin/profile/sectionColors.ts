/** CV içerik görüntüleyici için section renk haritası */
export const SECTION_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'Kişisel Bilgiler': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'person' },
  'Özet':             { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'format_quote' },
  'Deneyimler':       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'work' },
  'Eğitim':           { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'school' },
  'Yetenekler':       { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'build' },
  'Projeler':         { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', icon: 'code' },
  'Sertifikalar':     { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'workspace_premium' },
  'Diller':           { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', icon: 'language' },
  'Yayınlar & Patentler': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', icon: 'article' },
  'Referanslar':      { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', icon: 'contacts' },
};

export const DEF_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', icon: 'description' };
