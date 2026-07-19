"use client";

import { useState } from "react";
import type { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";
import { recordMatchResult, clearMatchResult, updateMatchSchedule } from "@/lib/firestore-api";

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
  const [editingTime, setEditingTime] = useState(false);

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
      <div className="rounded-lg border border-dashed border-black/15 px-3 py-2 text-sm text-[var(--foreground)]/50 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span>
            {poolName ?? match.roundLabel} &middot; Baan {match.lane} &middot; wacht op vorige ronde
          </span>
          <button
            onClick={() => setEditingTime((v) => !v)}
            className="text-xs text-[var(--color-sky)] hover:underline whitespace-nowrap"
          >
            {editingTime ? "Annuleren" : "Tijd/baan wijzigen"}
          </button>
        </div>
        {editingTime && <MatchScheduleEditor tId={tId} match={match} onDone={() => setEditingTime(false)} />}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-sun-dark)]/40 bg-white px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-[var(--color-sky)] font-medium">
          {poolName ?? match.roundLabel} &middot; Baan {match.lane} &middot;{" "}
          {new Date(match.startTime).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <button
          onClick={() => setEditingTime((v) => !v)}
          className="text-xs text-[var(--color-sky)] hover:underline whitespace-nowrap"
        >
          {editingTime ? "Annuleren" : "Tijd/baan wijzigen"}
        </button>
      </div>
      {editingTime && (
        <MatchScheduleEditor
          tId={tId}
          match={match}
          onDone={() => setEditingTime(false)}
        />
      )}
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

/** Laat toe om het tijdstip en/of de baan van één individuele wedstrijd aan te passen, los van de rest van haar tijdslot. */
function MatchScheduleEditor({ tId, match, onDone }: { tId: string; match: Match; onDone: () => void }) {
  const [value, setValue] = useState(match.startTime.slice(0, 16));
  const [lane, setLane] = useState(match.lane.toString());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value || !lane) return;
    setSaving(true);
    try {
      await updateMatchSchedule(tId, match.id, new Date(value).toISOString(), parseInt(lane, 10));
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-sun)]/10 px-2 py-2">
      <label className="flex items-center gap-1 text-xs">
        Tijdstip
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-1 text-xs">
        Baan
        <input
          type="number"
          min={1}
          value={lane}
          onChange={(e) => setLane(e.target.value)}
          className="w-14 border rounded px-2 py-1"
        />
      </label>
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-[var(--color-sky)] text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
      >
        Opslaan
      </button>
    </div>
  );
}
