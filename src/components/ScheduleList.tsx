import type { Match, Pool, Team } from "@/lib/types";
import MatchRow from "./MatchRow";

interface Props {
  matches: Match[];
  teams: Team[];
  pools?: Pool[];
  matchDurationMinutes?: number;
  now?: Date;
}

/** Toont een lijst wedstrijden gegroepeerd per tijdslot, gesorteerd op tijd en baan. */
export default function ScheduleList({ matches, teams, pools, matchDurationMinutes, now }: Props) {
  const poolNameById = new Map((pools ?? []).map((p) => [p.id, p.name]));
  const sorted = [...matches].sort((a, b) => {
    const t = a.startTime.localeCompare(b.startTime);
    if (t !== 0) return t;
    return a.lane - b.lane;
  });

  const byTime = new Map<string, Match[]>();
  for (const m of sorted) {
    const arr = byTime.get(m.startTime) ?? [];
    arr.push(m);
    byTime.set(m.startTime, arr);
  }

  if (matches.length === 0) {
    return <p className="text-sm text-[var(--foreground)]/60">Nog geen wedstrijden gepland.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(byTime.entries()).map(([time, ms]) => (
        <div key={time} className="flex flex-col gap-1.5">
          {ms.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              teams={teams}
              poolName={m.stage === "pool" ? poolNameById.get(m.poolId ?? "") : undefined}
              matchDurationMinutes={matchDurationMinutes}
              now={now}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
