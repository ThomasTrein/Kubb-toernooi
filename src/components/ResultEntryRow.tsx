"use client";

import { useState } from "react";
import type { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";
import { recordMatchResult, clearMatchResult } from "@/lib/firestore-api";

interface Props {
  tId: string;
  match: Match;
  teams: Team[];
  poolName?: string;
}

/** Admin-rij om de uitslag van één wedstrijd in te voeren of te wijzigen. */
export default function ResultEntryRow({ tId, match, teams, poolName }: Props) {
  const [winnerId, setWinnerId] = useState(match.winnerId ?? "");
  const [kubbs, setKubbs] = useState(match.winnerKubbsLeft?.toString() ?? "");
  const [wonByKing, setWonByKing] = useState(!!match.wonByKing);
  const [saving, setSaving] = useState(false);

  const canPlay = !!match.teamAId && !!match.teamBId;

  async function handleSave() {
    if (!winnerId) return;
    setSaving(true);
    try {
      await recordMatchResult(tId, match, winnerId, kubbs ? parseInt(kubbs, 10) : null, wonByKing);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await clearMatchResult(tId, match);
      setWinnerId("");
      setKubbs("");
      setWonByKing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!canPlay) {
    return (
      <div className="rounded-lg border border-dashed border-black/15 px-3 py-2 text-sm text-[var(--foreground)]/50">
        {poolName ?? match.roundLabel} &middot; Baan {match.lane} &middot; wacht op vorige ronde
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-sun-dark)]/40 bg-white px-3 py-3 flex flex-col gap-2">
      <div className="text-xs text-[var(--color-sky)] font-medium">
        {poolName ?? match.roundLabel} &middot; Baan {match.lane} &middot;{" "}
        {new Date(match.startTime).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="flex items-center gap-2 flex-1">
          <input
            type="radio"
            name={`winner-${match.id}`}
            checked={winnerId === match.teamAId}
            onChange={() => setWinnerId(match.teamAId!)}
          />
          {getTeamName(teams, match.teamAId)}
        </label>
        <label className="flex items-center gap-2 flex-1">
          <input
            type="radio"
            name={`winner-${match.id}`}
            checked={winnerId === match.teamBId}
            onChange={() => setWinnerId(match.teamBId!)}
          />
          {getTeamName(teams, match.teamBId)}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-sm">
          Overgebleven kubbs winnaar:
          <input
            type="number"
            min={0}
            value={kubbs}
            onChange={(e) => setKubbs(e.target.value)}
            className="w-16 border rounded px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={wonByKing} onChange={(e) => setWonByKing(e.target.checked)} />
          Gewonnen via koningsstok
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !winnerId}
          className="ml-auto rounded-lg bg-[var(--color-grass)] text-white text-sm font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          Opslaan
        </button>
        {match.winnerId && (
          <button onClick={handleClear} disabled={saving} className="text-sm text-red-600 hover:underline">
            Wis uitslag
          </button>
        )}
      </div>
    </div>
  );
}
