"use client";

import { useState } from "react";
import type { Match, Pool, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";
import { updateTimeSlot } from "@/lib/firestore-api";

interface Props {
  tId: string;
  matches: Match[];
  teams: Team[];
  pools?: Pool[];
}

/** Groepeert wedstrijden per tijdslot en laat toe om de tijd van een heel tijdslot in één keer te wijzigen. */
export default function TimeSlotEditor({ tId, matches, teams, pools }: Props) {
  const poolNameById = new Map((pools ?? []).map((p) => [p.id, p.name]));

  const byTime = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = byTime.get(m.startTime) ?? [];
    arr.push(m);
    byTime.set(m.startTime, arr);
  }
  const slots = Array.from(byTime.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (slots.length === 0) {
    return <p className="text-sm text-[var(--foreground)]/60">Nog geen wedstrijden gepland.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {slots.map(([startTime, ms]) => (
        <TimeSlotRow
          key={startTime}
          tId={tId}
          startTime={startTime}
          slotMatches={ms.sort((a, b) => a.lane - b.lane)}
          allMatches={matches}
          teams={teams}
          poolNameById={poolNameById}
        />
      ))}
    </div>
  );
}

function TimeSlotRow({
  tId,
  startTime,
  slotMatches,
  allMatches,
  teams,
  poolNameById,
}: {
  tId: string;
  startTime: string;
  slotMatches: Match[];
  allMatches: Match[];
  teams: Team[];
  poolNameById: Map<string, string>;
}) {
  const [value, setValue] = useState(startTime.slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = value && new Date(value).toISOString() !== new Date(startTime).toISOString();

  async function handleSave() {
    if (!value) return;
    const newStartTime = new Date(value).toISOString();
    setSaving(true);
    try {
      await updateTimeSlot(tId, allMatches, startTime, newStartTime);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-sun-dark)]/40 bg-white px-3 py-2.5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Tijdstip
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-lg bg-[var(--color-sky)] text-white text-sm font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          Opslaan voor alle {slotMatches.length} wedstrijden
        </button>
        {saved && <span className="text-sm text-[var(--color-grass)]">Opgeslagen!</span>}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-[var(--foreground)]/70">
        {slotMatches.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="text-xs shrink-0 text-[var(--foreground)]/50">Baan {m.lane}</span>
            <span className="text-xs text-[var(--color-sky)] font-medium shrink-0">
              {m.stage === "pool" ? poolNameById.get(m.poolId ?? "") : m.roundLabel}
            </span>
            <span className="truncate">
              {getTeamName(teams, m.teamAId)} vs {getTeamName(teams, m.teamBId)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
