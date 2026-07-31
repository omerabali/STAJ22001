/**
 * 1. Send Code Step - Telefon veya E-posta ile şifre sıfırlama kodu gönderme (Step 1)
 */
export function initSendCodeStep(): void {
  const form = document.getElementById('forgot-password-form') as HTMLFormElement;
  const errorFeedback = document.getElementById('error-feedback') as HTMLDivElement;
  const successFeedback = document.getElementById('success-feedback') as HTMLDivElement;
  const step1 = document.getElementById('step-1') as HTMLDivElement;
  const step2 = document.getElementById('step-2') as HTMLDivElement;
  const formTitle = document.getElementById('form-title') as HTMLHeadingElement;
  const formDesc = document.getElementById('form-desc') as HTMLParagraphElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (step1.style.display === 'none') return; // Step 2'deyken çalışmasın

    const inputEl = (document.getElementById('email_or_phone') || document.getElementById('phone')) as HTMLInputElement;
    const phoneOrEmail = inputEl ? inputEl.value.trim() : '';

    if (errorFeedback) errorFeedback.style.display = 'none';
    if (successFeedback) successFeedback.style.display = 'none';

    if (!phoneOrEmail) {
      if (errorFeedback) {
        errorFeedback.style.display = 'block';
        errorFeedback.textContent = '[Hata]: Lütfen e-posta adresinizi veya telefon numaranızı girin.';
      }
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneOrEmail, email: phoneOrEmail })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Bir hata oluştu.');

      // Step 2'ye geç ve kutucukları sıfırla
      step1.style.display = 'none';
      step2.style.display = 'flex';

      const codeInput = document.getElementById('code') as HTMLInputElement;
      const newPasswordInput = document.getElementById('new_password') as HTMLInputElement;
      if (codeInput) codeInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';

      if (formTitle) formTitle.textContent = 'Kodu Doğrulayın ve Yeni Şifre';
      if (formDesc) formDesc.textContent = `${phoneOrEmail} adresine gönderilen 6 haneli doğrulama kodunu ve yeni şifrenizi girin.`;

      if (successFeedback) {
        successFeedback.style.display = 'block';
        successFeedback.textContent = data.message || 'Doğrulama kodu gönderildi.';
      }
    } catch (error: any) {
      if (errorFeedback) {
        errorFeedback.style.display = 'block';
        errorFeedback.textContent = `[Hata]: ${error.message}`;
      }
    }
  });
}
