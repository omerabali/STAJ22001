/**
 * 1. Send Code Step - Telefon numarasıyla SMS kodu gönderme (Step 1)
 */
export function initSendCodeStep(): void {
  const form = document.getElementById('forgot-password-form') as HTMLFormElement;
  const statusFeedback = document.getElementById('status-feedback') as HTMLDivElement;
  const step1 = document.getElementById('step-1') as HTMLDivElement;
  const step2 = document.getElementById('step-2') as HTMLDivElement;
  const formTitle = document.getElementById('form-title') as HTMLHeadingElement;
  const formDesc = document.getElementById('form-desc') as HTMLParagraphElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawPhone = (document.getElementById('phone') as HTMLInputElement).value;
    const phone = rawPhone.trim();

    statusFeedback.classList.add('hidden');
    statusFeedback.textContent = '';

    try {
      const response = await fetch('/api/auth/forgot-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Bir hata oluştu.');

      // Step 2'ye geç
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      formTitle.textContent = 'Kodu Doğrulayın';
      formDesc.textContent = `${phone} numarasına gönderilen SMS kodunu girin. (Dev ortamı: Konsola yazdırıldı)`;

      statusFeedback.classList.remove('hidden', 'bg-red-950/40', 'border-red-500/30', 'text-red-200');
      statusFeedback.classList.add('bg-emerald-950/40', 'border-emerald-500/30', 'text-emerald-200', 'border');
      statusFeedback.textContent = data.message;
    } catch (error: any) {
      statusFeedback.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/30', 'text-emerald-200');
      statusFeedback.classList.add('bg-red-950/40', 'border-red-500/30', 'text-red-200', 'border');
      statusFeedback.textContent = `[Hata]: ${error.message}`;
    }
  });
}
