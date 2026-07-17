"use client";

import { useEffect, useState } from "react";
import type { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";

interface Props {
  matches: Match[];
  teams: Team[];
  numLanes: number;
  matchDurationMinutes: number;
}

/** Toont per baan de huidige (live) en eerstvolgende wedstrijd, gebaseerd op de klok. */
export default function LiveLanes({ matches, teams, numLanes, matchDurationMinutes }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- klok mag pas na mount gezet worden om SSR-mismatch te voorkomen
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const lanes = Array.from({ length: numLanes }, (_, i) => i + 1);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {lanes.map((lane) => {
        const laneMatches = matches
          .filter((m) => m.lane === lane)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const current = laneMatches.find((m) => {
          const start = new Date(m.startTime);
          const end = new Date(start.getTime() + matchDurationMinutes * 60000);
          return !m.winnerId && now >= start && now < end;
        });
        const upcoming = laneMatches.find((m) => new Date(m.startTime) > now && !m.winnerId);

        return (
          <div key={lane} className="rounded-xl border-2 border-[var(--color-sun-dark)] bg-white p-4">
            <h3 className="font-bold text-[var(--color-wood)] mb-2">Baan {lane}</h3>
            {current ? (
              <div className="mb-2">
                <span className="text-xs font-semibold text-[var(--color-sky)]">🔴 NU BEZIG</span>
                <p className="font-medium">
                  {getTeamName(teams, current.teamAId)} vs {getTeamName(teams, current.teamBId)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)]/50 mb-2">Geen wedstrijd nu bezig</p>
            )}
            {upcoming && (
              <div>
                <span className="text-xs font-semibold text-[var(--foreground)]/60">VOLGENDE</span>
                <p className="text-sm">
                  {getTeamName(teams, upcoming.teamAId)} vs {getTeamName(teams, upcoming.teamBId)} &middot;{" "}
                  {new Date(upcoming.startTime).toLocaleTimeString("nl-BE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
