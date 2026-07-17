"use client";

import { useState } from "react";
import type { TournamentSettings } from "@/lib/types";
import { updateTournamentSettings } from "@/lib/firestore-api";

interface Props {
  tId: string;
  settings: TournamentSettings;
}

export default function SettingsForm({ tId, settings }: Props) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateTournamentSettings(tId, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3 max-w-md rounded-xl border-2 border-[var(--color-sun-dark)]/50 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        Aantal poules
        <input
          type="number"
          min={1}
          value={form.numPools}
          onChange={(e) => setForm({ ...form, numPools: parseInt(e.target.value, 10) || 1 })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Aantal doorstromers per poule naar knock-out
        <input
          type="number"
          min={1}
          value={form.qualifiersPerPool}
          onChange={(e) => setForm({ ...form, qualifiersPerPool: parseInt(e.target.value, 10) || 1 })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Aantal kubb-banen
        <input
          type="number"
          min={1}
          value={form.numLanes}
          onChange={(e) => setForm({ ...form, numLanes: parseInt(e.target.value, 10) || 1 })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Duur per wedstrijd (minuten)
        <input
          type="number"
          min={5}
          value={form.matchDurationMinutes}
          onChange={(e) => setForm({ ...form, matchDurationMinutes: parseInt(e.target.value, 10) || 5 })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Startijd poulefase
        <input
          type="datetime-local"
          value={form.poolsStartTime.slice(0, 16)}
          onChange={(e) => setForm({ ...form, poolsStartTime: e.target.value })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Starttijd knock-outfase (optioneel, anders zelfde als poulefase)
        <input
          type="datetime-local"
          value={form.knockoutStartTime?.slice(0, 16) ?? ""}
          onChange={(e) => setForm({ ...form, knockoutStartTime: e.target.value || null })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Punten per gewonnen wedstrijd
        <input
          type="number"
          min={1}
          value={form.pointsPerWin}
          onChange={(e) => setForm({ ...form, pointsPerWin: parseInt(e.target.value, 10) || 1 })}
          className="border rounded px-2 py-1.5"
        />
      </label>
      <button className="rounded-lg bg-[var(--color-sun-dark)] text-white font-semibold px-3 py-2 text-sm">
        Instellingen opslaan
      </button>
      {saved && <p className="text-sm text-[var(--color-grass)]">Opgeslagen!</p>}
    </form>
  );
}
