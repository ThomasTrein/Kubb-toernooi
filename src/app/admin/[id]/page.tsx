"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  subscribeTournament,
  subscribeTeams,
  subscribePools,
  subscribeMatches,
  generatePoolsAndSchedule,
  generateKnockoutStage,
  deleteTournament,
  renameTournament,
} from "@/lib/firestore-api";
import type { Tournament, Team, Pool, Match, Standing } from "@/lib/types";
import { calculatePoolStandings } from "@/lib/scheduling";
import SettingsForm from "@/components/SettingsForm";
import TeamEditor from "@/components/TeamEditor";
import StandingsTable from "@/components/StandingsTable";
import ResultEntryRow from "@/components/ResultEntryRow";
import BracketView from "@/components/BracketView";
import TimeSlotEditor from "@/components/TimeSlotEditor";
import FinalRankingTable from "@/components/FinalRankingTable";

type Tab = "instellingen" | "teams" | "schema" | "knockout" | "tijden";

export default function AdminTournamentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tId = params.id;

  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<Tab>("instellingen");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tId) return;
    const unsubs = [
      subscribeTournament(tId, setTournament),
      subscribeTeams(tId, setTeams),
      subscribePools(tId, setPools),
      subscribeMatches(tId, setMatches),
    ];
    return () => unsubs.forEach((u) => u());
  }, [tId]);

  if (tournament === undefined) return <p>Laden...</p>;
  if (tournament === null) return <p>Toernooi niet gevonden.</p>;

  const poolMatches = matches.filter((m) => m.stage === "pool");
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");
  const classificationMatches = matches.filter((m) => m.stage === "classification");
  const poolNameById = new Map(pools.map((p) => [p.id, p.name]));

  const standingsByPool: Record<string, Standing[]> = {};
  for (const pool of pools) {
    standingsByPool[pool.id] = calculatePoolStandings(pool.teamIds, poolMatches, tournament!.settings);
  }
  const classificationRanks = Array.from(
    new Set(classificationMatches.map((m) => m.classificationRank).filter((r): r is number => !!r))
  ).sort((a, b) => a - b);

  async function handleGenerateSchedule() {
    if (
      poolMatches.length > 0 &&
      !confirm("Er bestaat al een poule-indeling/schema. Opnieuw genereren overschrijft dit volledig. Doorgaan?")
    ) {
      return;
    }
    setBusy(true);
    try {
      await generatePoolsAndSchedule(tId, teams, tournament!.settings);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateKnockout() {
    if (
      (knockoutMatches.length > 0 || classificationMatches.length > 0) &&
      !confirm("Er bestaat al een knock-out fase. Opnieuw genereren overschrijft dit volledig. Doorgaan?")
    ) {
      return;
    }
    setBusy(true);
    try {
      await generateKnockoutStage(tId, teams, pools, matches, tournament!.settings);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Toernooi "${tournament!.name}" volledig verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    await deleteTournament(tId);
    router.push("/admin");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "instellingen", label: "Instellingen" },
    { key: "teams", label: `Teams (${teams.length})` },
    { key: "schema", label: "Schema & uitslagen" },
    { key: "knockout", label: "Knock-out" },
    { key: "tijden", label: "Tijden" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <RenameableTitle tId={tId} name={tournament.name} />
        <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
          Toernooi verwijderen
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-black/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--color-sun-dark)] text-[var(--color-wood)]"
                : "border-transparent text-[var(--foreground)]/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "instellingen" && <SettingsForm tId={tId} settings={tournament.settings} />}

      {tab === "teams" && <TeamEditor tId={tId} teams={teams} />}

      {tab === "schema" && (
        <div className="flex flex-col gap-6">
          <button
            onClick={handleGenerateSchedule}
            disabled={busy || teams.length < 2}
            className="self-start rounded-lg bg-[var(--color-sky)] text-white font-semibold px-4 py-2 disabled:opacity-50"
          >
            {poolMatches.length > 0 ? "Poule-indeling & schema opnieuw genereren" : "Poule-indeling & schema genereren"}
          </button>
          {teams.length < 2 && <p className="text-sm text-[var(--foreground)]/60">Voeg eerst minstens 2 teams toe.</p>}

          {pools.map((pool) => (
            <div key={pool.id} className="flex flex-col gap-2">
              <h3 className="font-bold text-[var(--color-wood)]">{pool.name}</h3>
              <StandingsTable
                pool={pool}
                teams={teams}
                matches={poolMatches}
                settings={tournament.settings}
                qualifiersPerPool={tournament.settings.qualifiersPerPool}
              />
              <div className="flex flex-col gap-2 mt-2">
                {poolMatches
                  .filter((m) => m.poolId === pool.id)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.lane - b.lane)
                  .map((m) => (
                    <ResultEntryRow key={m.id} tId={tId} match={m} teams={teams} poolName={poolNameById.get(pool.id)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "knockout" && (
        <div className="flex flex-col gap-6">
          <button
            onClick={handleGenerateKnockout}
            disabled={busy || pools.length === 0}
            className="self-start rounded-lg bg-[var(--color-sky)] text-white font-semibold px-4 py-2 disabled:opacity-50"
          >
            {knockoutMatches.length > 0 ? "Knock-out fase opnieuw genereren" : "Knock-out fase genereren"}
          </button>
          {pools.length === 0 && (
            <p className="text-sm text-[var(--foreground)]/60">Genereer eerst de poulefase.</p>
          )}

          {classificationRanks.map((rank) => {
            const rankMatches = classificationMatches.filter((m) => m.classificationRank === rank);
            return (
              <div key={rank} className="flex flex-col gap-2">
                <h3 className="font-bold text-[var(--color-wood)]">Kruisfinale om plaats {rank}</h3>
                <BracketView matches={rankMatches} teams={teams} />
                <div className="flex flex-col gap-2">
                  {rankMatches
                    .sort((a, b) => a.round - b.round || a.lane - b.lane)
                    .map((m) => (
                      <ResultEntryRow key={m.id} tId={tId} match={m} teams={teams} />
                    ))}
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-[var(--color-wood)]">Hoofd-knockout</h3>
            <BracketView matches={knockoutMatches} teams={teams} />
            <div className="flex flex-col gap-2">
              {knockoutMatches
                .sort((a, b) => a.round - b.round || a.lane - b.lane)
                .map((m) => (
                  <ResultEntryRow key={m.id} tId={tId} match={m} teams={teams} />
                ))}
            </div>
          </div>

          <FinalRankingTable
            pools={pools}
            standingsByPool={standingsByPool}
            qualifiersPerPool={tournament.settings.qualifiersPerPool}
            matches={matches}
            teams={teams}
          />
        </div>
      )}
      {tab === "tijden" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground)]/60">
            Wijzig het tijdstip van een tijdslot; alle wedstrijden die op dat tijdstip gepland staan
            verschuiven automatisch mee.
          </p>
          <TimeSlotEditor tId={tId} matches={matches} teams={teams} pools={pools} />
        </div>
      )}
    </div>
  );
}

function RenameableTitle({ tId, name }: { tId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (editing) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (value.trim()) await renameTournament(tId, value.trim());
          setEditing(false);
        }}
        className="flex gap-2"
      >
        <input value={value} onChange={(e) => setValue(e.target.value)} className="border rounded px-2 py-1 font-bold" />
        <button className="text-sm text-[var(--color-sky)]">Opslaan</button>
      </form>
    );
  }

  return (
    <h1 onClick={() => setEditing(true)} className="text-2xl font-bold text-[var(--color-wood)] cursor-pointer" title="Klik om te hernoemen">
      {name} ✏️
    </h1>
  );
}
