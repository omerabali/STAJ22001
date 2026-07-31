/**
 * 2. Verify Code Step - 6 haneli kodu doğrulama ve yeni şifre yenileme (Step 2)
 */
export function initVerifyCodeStep(): void {
  const verifyBtn = document.getElementById('verify-btn') as HTMLButtonElement;
  const errorFeedback = document.getElementById('error-feedback') as HTMLDivElement;
  const successFeedback = document.getElementById('success-feedback') as HTMLDivElement;

  verifyBtn?.addEventListener('click', async () => {
    const inputEl = (document.getElementById('email_or_phone') || document.getElementById('phone')) as HTMLInputElement;
    const phoneOrEmail = inputEl ? inputEl.value.trim() : '';
    const codeEl = document.getElementById('code') as HTMLInputElement;
    const code = codeEl ? codeEl.value.trim() : '';
    const newPasswordEl = document.getElementById('new_password') as HTMLInputElement;
    const newPassword = newPasswordEl ? newPasswordEl.value : '';

    if (errorFeedback) errorFeedback.style.display = 'none';
    if (successFeedback) successFeedback.style.display = 'none';

    if (!code || code.length < 6) {
      if (errorFeedback) {
        errorFeedback.style.display = 'block';
        errorFeedback.textContent = '[Hata]: Lütfen 6 haneli doğrulama kodunu girin.';
      }
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      if (errorFeedback) {
        errorFeedback.style.display = 'block';
        errorFeedback.textContent = '[Hata]: Yeni şifre en az 6 karakter olmalıdır.';
      }
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneOrEmail, email: phoneOrEmail, code, newPassword })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Doğrulama başarısız.');

      if (successFeedback) {
        successFeedback.style.display = 'block';
        successFeedback.textContent = 'Şifreniz başarıyla güncellendi! Giriş yapılıyor...';
      }

      setTimeout(() => {
        if (data.user && data.user.role === 'ADMIN') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/candidate/profile';
        }
      }, 1000);
    } catch (error: any) {
      if (errorFeedback) {
        errorFeedback.style.display = 'block';
        errorFeedback.textContent = `[Hata]: ${error.message}`;
      }
    }
  });
}
