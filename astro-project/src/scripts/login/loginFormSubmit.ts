/**
 * loginFormSubmit.ts (Giriş Yapma & API Gönderim Merkezi)
 * Görevi: "Giriş Yap" butonuna basıldığında form verilerini alır, e-posta formatını doğrular,
 * fetch('/api/auth/login') ile Node.js backend sunucusuna isteği iletir.
 * Giriş başarılıysa kullanıcının rolüne göre (ADMIN -> /admin/dashboard, CANDIDATE -> /candidate/profile) yönlendirir.
 */
export function initLoginFormSubmit(): void {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const errorFeedback = document.getElementById('error-feedback') as HTMLDivElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawEmail = (document.getElementById('email') as HTMLInputElement).value;
    const email = rawEmail.trim().toLowerCase();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    errorFeedback.style.display = 'none';
    errorFeedback.textContent = '';

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Lütfen geçerli bir @gmail.com adresi girin.';
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Sunucudan geçersiz yanıt alındı. Lütfen servisin çalıştığından emin olun.');
      }

      if (!response.ok) throw new Error(data.message || 'Kimlik doğrulama başarısız.');

      try { sessionStorage.clear(); localStorage.clear(); } catch (e) {}

      if (data.user && data.user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/candidate/profile';
      }
    } catch (error: any) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = `[Hata]: ${error.message}`;
    }
  });
}
