"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeTournaments } from "@/lib/firestore-api";
import type { Tournament } from "@/lib/types";

const statusLabel: Record<Tournament["status"], string> = {
  setup: "Nog in voorbereiding",
  pools_generated: "Poulefase bezig",
  knockout_generated: "Knock-outfase bezig",
};

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);

  useEffect(() => {
    const unsub = subscribeTournaments(setTournaments);
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center py-8">
        <h1 className="text-4xl font-extrabold text-[var(--color-wood)] mb-2">🪵 Kubb Toernooien</h1>
        <p className="text-lg text-[var(--foreground)]/70">
          Bekijk hier de poule-indeling, het wedstrijdschema en de standen van alle kubb-toernooien.
        </p>
      </section>

      {tournaments === null && <p className="text-center">Laden...</p>}
      {tournaments !== null && tournaments.length === 0 && (
        <p className="text-center text-[var(--foreground)]/60">
          Er is nog geen toernooi aangemaakt. Ga naar{" "}
          <Link href="/admin" className="underline font-medium">
            Beheer
          </Link>{" "}
          om er een te starten.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {tournaments?.map((t) => (
          <Link
            key={t.id}
            href={`/t/${t.id}`}
            className="block rounded-2xl border-2 border-[var(--color-sun-dark)] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-bold text-[var(--color-wood)]">{t.name}</h2>
            <p className="text-sm text-[var(--color-sky)] font-medium mt-1">{statusLabel[t.status]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
