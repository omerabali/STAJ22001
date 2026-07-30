/**
 * 2. Verify Code Step - 6 haneli kodu doğrulama ve giriş yönlendirmesi (Step 2)
 */
export function initVerifyCodeStep(): void {
  const verifyBtn = document.getElementById('verify-btn') as HTMLButtonElement;
  const statusFeedback = document.getElementById('status-feedback') as HTMLDivElement;

  verifyBtn?.addEventListener('click', async () => {
    const rawPhone = (document.getElementById('phone') as HTMLInputElement).value;
    const phone = rawPhone.trim();
    const code = (document.getElementById('code') as HTMLInputElement).value.trim();

    if (!code) {
      statusFeedback.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/30', 'text-emerald-200');
      statusFeedback.classList.add('bg-red-950/40', 'border-red-500/30', 'text-red-200', 'border');
      statusFeedback.textContent = `[Hata]: Lütfen kodu girin.`;
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Doğrulama başarısız.');

      // Role bazlı yönlendirme
      if (data.user && data.user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/candidate/profile';
      }
    } catch (error: any) {
      statusFeedback.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/30', 'text-emerald-200');
      statusFeedback.classList.add('bg-red-950/40', 'border-red-500/30', 'text-red-200', 'border');
      statusFeedback.textContent = `[Hata]: ${error.message}`;
    }
  });
}
