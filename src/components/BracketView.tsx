import type { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";

interface Props {
  matches: Match[];
  teams: Team[];
}

export default function BracketView({ matches, teams }: Props) {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  if (matches.length === 0) {
    return <p className="text-sm text-[var(--foreground)]/60">De knock-out bracket is nog niet gegenereerd.</p>;
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => a.lane - b.lane);
        const label = roundMatches[0]?.roundLabel ?? `Ronde ${round}`;
        return (
          <div key={round} className="flex flex-col gap-4 min-w-[220px]">
            <h3 className="text-center font-bold text-[var(--color-wood)]">{label}</h3>
            <div className="flex flex-col gap-6 justify-around flex-1">
              {roundMatches.map((m) => {
                const aWon = m.winnerId && m.winnerId === m.teamAId;
                const bWon = m.winnerId && m.winnerId === m.teamBId;
                return (
                  <div key={m.id} className="rounded-lg border-2 border-[var(--color-sun-dark)] bg-white overflow-hidden">
                    <div
                      className={`px-3 py-1.5 text-sm border-b border-black/10 ${
                        aWon ? "font-bold bg-[var(--color-grass)]/15" : ""
                      }`}
                    >
                      {getTeamName(teams, m.teamAId)}
                    </div>
                    <div className={`px-3 py-1.5 text-sm ${bWon ? "font-bold bg-[var(--color-grass)]/15" : ""}`}>
                      {getTeamName(teams, m.teamBId)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
