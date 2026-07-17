"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { addTeam, updateTeam, deleteTeam } from "@/lib/firestore-api";

interface Props {
  tId: string;
  teams: Team[];
}

function PlayersInput({ players, setPlayers }: { players: string[]; setPlayers: (p: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {players.map((p, i) => (
        <div key={i} className="flex gap-1">
          <input
            value={p}
            onChange={(e) => {
              const next = [...players];
              next[i] = e.target.value;
              setPlayers(next);
            }}
            placeholder={`Speler ${i + 1}`}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => setPlayers(players.filter((_, idx) => idx !== i))}
            className="text-red-500 text-sm px-1"
            aria-label="Verwijder speler"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPlayers([...players, ""])}
        className="text-sm text-[var(--color-sky)] hover:underline text-left"
      >
        + Speler toevoegen
      </button>
    </div>
  );
}

export default function TeamEditor({ tId, teams }: Props) {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<string[]>([""]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanPlayers = players.map((p) => p.trim()).filter(Boolean);
    if (editingId) {
      await updateTeam(tId, editingId, name.trim(), cleanPlayers);
      setEditingId(null);
    } else {
      await addTeam(tId, name.trim(), cleanPlayers);
    }
    setName("");
    setPlayers([""]);
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setName(team.name);
    setPlayers(team.players.length ? team.players : [""]);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setPlayers([""]);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="flex flex-col gap-2 max-w-sm rounded-xl border-2 border-[var(--color-sun-dark)]/50 bg-white p-4">
        <h3 className="font-bold text-[var(--color-wood)]">{editingId ? "Team bewerken" : "Team toevoegen"}</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Teamnaam"
          className="border rounded px-2 py-1.5"
        />
        <PlayersInput players={players} setPlayers={setPlayers} />
        <div className="flex gap-2 mt-1">
          <button className="rounded-lg bg-[var(--color-sun-dark)] text-white font-semibold px-3 py-1.5 text-sm">
            {editingId ? "Opslaan" : "Toevoegen"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-[var(--foreground)]/60 hover:underline">
              Annuleren
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="font-bold text-[var(--color-wood)]">Teams ({teams.length})</h3>
        {teams.map((t) => (
          <div key={t.id} className="rounded-lg border border-black/10 bg-white px-3 py-2 flex items-center justify-between gap-2">
            <div>
              <span className="font-medium">{t.name}</span>
              {t.players.length > 0 && (
                <span className="text-xs text-[var(--foreground)]/60 ml-2">{t.players.join(", ")}</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(t)} className="text-sm text-[var(--color-sky)] hover:underline">
                Bewerken
              </button>
              <button
                onClick={() => deleteTeam(tId, t.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Verwijderen
              </button>
            </div>
          </div>
        ))}
        {teams.length === 0 && <p className="text-sm text-[var(--foreground)]/60">Nog geen teams toegevoegd.</p>}
      </div>
    </div>
  );
}
