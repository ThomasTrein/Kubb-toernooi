import type { Match, Pool, Standing, Team } from "@/lib/types";
import { computeFinalRanking, getTeamName } from "@/lib/scheduling";

interface Props {
  pools: Pool[];
  standingsByPool: Record<string, Standing[]>;
  qualifiersPerPool: number;
  matches: Match[];
  teams: Team[];
}

/**
 * Toont de volledige eindranglijst: eerst de plaatsen uit de hoofd-knockout, daarna per
 * niet-gekwalificeerde poule-rang (bv. alle 3des, dan alle 4des) het blok van die
 * kruisfinale-bracket. Teams die in dezelfde ronde verliezen delen een plaatsenband (bv. "5e-8e").
 */
export default function FinalRankingTable({ pools, standingsByPool, qualifiersPerPool, matches, teams }: Props) {
  const rows = computeFinalRanking(pools, standingsByPool, qualifiersPerPool, matches);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold text-[var(--color-wood)]">Eindranglijst</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-[var(--foreground)]/60 border-b border-black/10">
            <th className="py-1.5 pr-2">Plaats</th>
            <th className="py-1.5">Team(s)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black/5">
              <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">
                {row.pending ? <span className="text-[var(--foreground)]/50">{row.rankLabel}</span> : row.rankLabel}
              </td>
              <td className="py-1.5">{row.teamIds.map((id) => getTeamName(teams, id)).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
