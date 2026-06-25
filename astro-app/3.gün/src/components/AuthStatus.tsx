import { useEffect, useState } from 'react';

type User = {
  email: string;
  name: string;
  role: string;
};

type MeResponse = {
  authenticated: boolean;
  user: User | null;
};

export default function AuthStatus() {
  const [data, setData] = useState<MeResponse | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch('/api/me')
      .then((response) => response.json())
      .then((payload: MeResponse) => {
        if (!ignore) {
          setData(payload);
        }
      })
      .catch(() => {
        if (!ignore) {
          setData({ authenticated: false, user: null });
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!data) {
    return (
      <section className="status-card" aria-live="polite">
        <strong>Oturum kontrol ediliyor</strong>
        <span className="muted">React island tarayicida /api/me endpointini cagiriyor.</span>
      </section>
    );
  }

  return (
    <section className="status-card" aria-live="polite">
      <div className="status-row">
        <strong>API oturum durumu</strong>
        <span>{data.authenticated ? 'Aktif' : 'Kapali'}</span>
      </div>
      <div className="status-row">
        <strong>Kullanici</strong>
        <span>{data.user?.email ?? 'Misafir'}</span>
      </div>
      <div className="status-row">
        <strong>Rol</strong>
        <span>{data.user?.role ?? 'Yok'}</span>
      </div>
    </section>
  );
}
