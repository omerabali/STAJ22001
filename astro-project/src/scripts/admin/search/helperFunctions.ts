/**
 * 1. Helper Functions
 * İsimden baş harf çıkarma (getInitials), ATS rozet rengi ve Yetenek etiketleri render fonksiyonları.
 */
export function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (email || 'AD').substring(0, 2).toUpperCase();
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
}

export function renderSkills(skills: string[]): string {
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return '<span class="text-[#8a8580] text-xs italic font-medium">Henüz analiz yok</span>';
  }
  return skills.slice(0, 3).map(s =>
    `<span class="bg-[#14422f]/10 text-[#14422f] px-2.5 py-1 rounded-[6px] font-semibold text-[11px]">${s}</span>`
  ).join('');
}
