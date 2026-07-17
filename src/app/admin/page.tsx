"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeTournaments, createTournament, DEFAULT_SETTINGS } from "@/lib/firestore-api";
import type { Tournament } from "@/lib/types";

export default function AdminHome() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = subscribeTournaments(setTournaments);
    return () => unsub();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createTournament(name.trim(), DEFAULT_SETTINGS);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-[var(--color-wood)]">Toernooien beheren</h1>

      <form onSubmit={handleCreate} className="flex gap-2 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam nieuw toernooi (bv. Zomerbar 2026)"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          disabled={creating}
          className="rounded-lg bg-[var(--color-sun-dark)] text-white font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          Aanmaken
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {tournaments.map((t) => (
          <Link
            key={t.id}
            href={`/admin/${t.id}`}
            className="rounded-xl border-2 border-[var(--color-sun-dark)]/50 bg-white p-4 hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <span className="font-semibold">{t.name}</span>
            <span className="text-xs text-[var(--color-sky)]">{t.status}</span>
          </Link>
        ))}
        {tournaments.length === 0 && (
          <p className="text-sm text-[var(--foreground)]/60">Nog geen toernooien. Maak er hierboven een aan.</p>
        )}
      </div>
    </div>
  );
}
