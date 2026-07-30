/**
 * 2. Input Focus/Blur ve Login Butonu Hover Efektleri
 */
export function initInputFocusAndHover(): void {
  // Focus styles
  document.querySelectorAll('.form-input').forEach((el) => {
    const input = el as HTMLInputElement;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#2d5a45';
      input.style.boxShadow = '0 0 0 4px rgba(45,90,69,0.1)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#c0c9c2';
      input.style.boxShadow = 'none';
    });
  });

  // Hover effect on button
  const loginBtn = document.getElementById('login-btn');
  loginBtn?.addEventListener('mouseover', () => {
    (loginBtn as HTMLButtonElement).style.background = '#224f3b';
    (loginBtn as HTMLButtonElement).style.transform = 'translateY(-1px)';
    (loginBtn as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(45,90,69,0.4)';
  });
  loginBtn?.addEventListener('mouseout', () => {
    (loginBtn as HTMLButtonElement).style.background = '#2d5a45';
    (loginBtn as HTMLButtonElement).style.transform = 'translateY(0)';
    (loginBtn as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(45,90,69,0.3)';
  });
}
