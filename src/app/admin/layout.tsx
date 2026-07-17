"use client";

import { useEffect, useState } from "react";
import { isAdminAuthenticated, loginWithPin, logoutAdmin } from "@/lib/admin-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- voorkomt SSR/hydratie-mismatch voor client-only sessionStorage check
    setAuthed(isAdminAuthenticated());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const ok = await loginWithPin(pin);
      if (ok) {
        setAuthed(true);
      } else {
        setError("Onjuiste PIN-code, probeer opnieuw.");
      }
    } catch {
      setError("Inloggen mislukt. Controleer je internetverbinding.");
    }
  }

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 w-full max-w-xs rounded-2xl border-2 border-[var(--color-sun-dark)] bg-white p-6"
        >
          <h1 className="text-xl font-bold text-[var(--color-wood)] text-center">Beheer &mdash; PIN vereist</h1>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN-code"
            className="border rounded-lg px-3 py-2"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-sun-dark)] text-white font-semibold py-2 hover:opacity-90"
          >
            Inloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={async () => {
            await logoutAdmin();
            setAuthed(false);
          }}
          className="text-xs text-[var(--foreground)]/60 hover:underline"
        >
          Uitloggen
        </button>
      </div>
      {children}
    </div>
  );
}
