/**
 * 6. /api/auth/register POST Form Gönderimi, Hata Yakalama ve Yönlendirme
 */
export function initRegisterFormSubmit(): void {
  const form = document.getElementById('register-form') as HTMLFormElement;
  const errorFeedback = document.getElementById('error-feedback') as HTMLDivElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirm_password') as HTMLInputElement;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawEmail = (document.getElementById('email') as HTMLInputElement).value;
    const email = rawEmail.trim().toLowerCase();
    const phone = (document.getElementById('phone') as HTMLInputElement).value.trim();
    const name = (document.getElementById('fullname') as HTMLInputElement).value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const termsChecked = (document.getElementById('terms') as HTMLInputElement).checked;
    const rememberMeChecked = (document.getElementById('remember_me') as HTMLInputElement).checked;

    errorFeedback.style.display = 'none';
    errorFeedback.textContent = '';

    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{3,}$/;
    if (!nameRegex.test(name)) { 
      errorFeedback.style.display = 'block'; 
      errorFeedback.textContent = '[Hata]: Ad Soyad en az 3 karakter olmalı ve yalnızca harflerden oluşmalıdır.'; 
      return; 
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Yalnızca geçerli @gmail.com uzantılı e-posta adresleri kabul edilmektedir.';
      return;
    }

    const phoneRegex = /^5\d{9}$/;
    if (!phoneRegex.test(phone)) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır (Örn: 5xxxxxxxxx).';
      return;
    }

    if (password.length < 6) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Şifre en az 6 karakter olmalıdır.';
      return;
    }

    if (password !== confirmPassword) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Girdiğiniz şifreler birbirleriyle eşleşmiyor.';
      return;
    }

    if (!termsChecked) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = '[Hata]: Devam etmek için Kullanım Şartları ve Gizlilik Politikası\'nı kabul etmelisiniz.';
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Kayıt işlemi başarısız.');
      
      if (rememberMeChecked) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      window.location.href = '/candidate/profile';
    } catch (error: any) {
      errorFeedback.style.display = 'block';
      errorFeedback.textContent = `[Hata]: ${error.message}`;
    }
  });
}
