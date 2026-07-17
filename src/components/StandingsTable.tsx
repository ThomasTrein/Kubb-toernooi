import type { Match, Pool, Standing, Team } from "@/lib/types";
import { calculatePoolStandings, getTeamName } from "@/lib/scheduling";
import type { TournamentSettings } from "@/lib/types";

interface Props {
  pool: Pool;
  teams: Team[];
  matches: Match[];
  settings: TournamentSettings;
  qualifiersPerPool: number;
}

export default function StandingsTable({ pool, teams, matches, settings, qualifiersPerPool }: Props) {
  const standings: Standing[] = calculatePoolStandings(pool.teamIds, matches, settings);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-sun-dark)]/40">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-sun)]/30">
          <tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Team</th>
            <th className="px-3 py-2">Gespeeld</th>
            <th className="px-3 py-2">Gewonnen</th>
            <th className="px-3 py-2">Verloren</th>
            <th className="px-3 py-2">Punten</th>
            <th className="px-3 py-2">Kubbs</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.teamId}
              className={
                i < qualifiersPerPool
                  ? "bg-[var(--color-grass)]/15 font-medium"
                  : i % 2 === 0
                  ? "bg-white"
                  : "bg-black/[.02]"
              }
            >
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{getTeamName(teams, s.teamId)}</td>
              <td className="px-3 py-2 text-center">{s.played}</td>
              <td className="px-3 py-2 text-center">{s.won}</td>
              <td className="px-3 py-2 text-center">{s.lost}</td>
              <td className="px-3 py-2 text-center font-bold">{s.points}</td>
              <td className="px-3 py-2 text-center">{s.kubbsLeftTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[var(--foreground)]/60 px-3 py-2">
        🟢 Groen = plaatst zich voor de knock-outfase
      </p>
    </div>
  );
}
