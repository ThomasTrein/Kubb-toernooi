"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { subscribeTournament, subscribeTeams, subscribePools, subscribeMatches } from "@/lib/firestore-api";
import type { Tournament, Team, Pool, Match } from "@/lib/types";
import StandingsTable from "@/components/StandingsTable";
import ScheduleList from "@/components/ScheduleList";
import LiveLanes from "@/components/LiveLanes";
import BracketView from "@/components/BracketView";

type Tab = "standen" | "schema" | "live" | "bracket";

export default function PublicTournamentPage() {
  const params = useParams<{ id: string }>();
  const tId = params.id;

  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<Tab>("standen");

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

  if (tournament === undefined) return <p className="text-center">Laden...</p>;
  if (tournament === null) return <p className="text-center">Toernooi niet gevonden.</p>;

  const poolMatches = matches.filter((m) => m.stage === "pool");
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");

  const tabs: { key: Tab; label: string }[] = [
    { key: "standen", label: "Poules & standen" },
    { key: "schema", label: "Schema" },
    { key: "live", label: "Live per baan" },
    { key: "bracket", label: "Knock-out" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--color-wood)]">{tournament.name}</h1>
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

      {tab === "standen" && (
        <div className="flex flex-col gap-6">
          {pools.length === 0 && (
            <p className="text-sm text-[var(--foreground)]/60">De poule-indeling is nog niet bekend.</p>
          )}
          {pools.map((pool) => (
            <div key={pool.id}>
              <h2 className="font-bold text-lg mb-2 text-[var(--color-wood)]">{pool.name}</h2>
              <StandingsTable
                pool={pool}
                teams={teams}
                matches={poolMatches}
                settings={tournament.settings}
                qualifiersPerPool={tournament.settings.qualifiersPerPool}
              />
            </div>
          ))}
        </div>
      )}

      {tab === "schema" && (
        <ScheduleList
          matches={poolMatches}
          teams={teams}
          pools={pools}
          matchDurationMinutes={tournament.settings.matchDurationMinutes}
        />
      )}

      {tab === "live" && (
        <LiveLanes
          matches={matches}
          teams={teams}
          numLanes={tournament.settings.numLanes}
          matchDurationMinutes={tournament.settings.matchDurationMinutes}
        />
      )}

      {tab === "bracket" && <BracketView matches={knockoutMatches} teams={teams} />}
    </div>
  );
}
