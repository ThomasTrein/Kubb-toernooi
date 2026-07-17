import type { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/scheduling";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  match: Match;
  teams: Team[];
  poolName?: string;
  now?: Date;
  matchDurationMinutes?: number;
  children?: React.ReactNode;
}

export default function MatchRow({ match, teams, poolName, now, matchDurationMinutes, children }: Props) {
  const start = new Date(match.startTime);
  const end = matchDurationMinutes ? new Date(start.getTime() + matchDurationMinutes * 60000) : null;
  const isFinished = !!match.winnerId;
  const isLive = !isFinished && now && end && now >= start && now < end;
  const teamAName = getTeamName(teams, match.teamAId);
  const teamBName = getTeamName(teams, match.teamBId);
  const teamAWon = match.winnerId && match.winnerId === match.teamAId;
  const teamBWon = match.winnerId && match.winnerId === match.teamBId;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        isLive
          ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
          : isFinished
          ? "border-black/10 bg-black/[.02]"
          : "border-[var(--color-sun-dark)]/30 bg-white"
      }`}
    >
      <div className="flex flex-col items-center w-16 shrink-0 text-xs text-[var(--foreground)]/70">
        <span className="font-semibold">{formatTime(match.startTime)}</span>
        <span>Baan {match.lane}</span>
      </div>
      <div className="flex-1 min-w-0">
        {poolName && <div className="text-xs text-[var(--color-sky)] font-medium">{poolName}</div>}
        {match.roundLabel && !poolName && (
          <div className="text-xs text-[var(--color-sky)] font-medium">{match.roundLabel}</div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate ${teamAWon ? "font-bold" : ""}`}>{teamAName}</span>
          <span className="text-xs text-[var(--foreground)]/50 shrink-0">vs</span>
          <span className={`truncate text-right ${teamBWon ? "font-bold" : ""}`}>{teamBName}</span>
        </div>
      </div>
      <div className="shrink-0 text-xs font-semibold">
        {isLive && <span className="text-[var(--color-sky)]">🔴 Bezig</span>}
        {isFinished && <span className="text-[var(--color-grass)]">✅ {match.winnerKubbsLeft ?? ""}</span>}
      </div>
      {children}
    </div>
  );
}
