import {
  distributeTeamsIntoPools,
  buildPoolMatches,
  calculatePoolStandings,
  getOverallSeeding,
  getRankGroupTeams,
  getClassificationRankIndexes,
  scheduleBracketGroups,
  computeFinalRanking,
  type BracketGroup,
} from "../src/lib/scheduling";
import type { Pool, Match, TournamentSettings, Standing } from "../src/lib/types";

// 4 poules, sommige met 4, sommige met 3 teams -> qualifiersPerPool=2 laat rang-3 en rang-4 groepen over.
const settings: TournamentSettings = {
  numPools: 4,
  qualifiersPerPool: 2,
  numLanes: 3,
  matchDurationMinutes: 20,
  poolsStartTime: new Date().toISOString(),
  knockoutStartTime: new Date(Date.now() + 3600_000).toISOString(),
  pointsPerWin: 3,
};

const teamIds = Array.from({ length: 14 }, (_, i) => `team${i + 1}`);
const poolTeamIds = distributeTeamsIntoPools(teamIds, settings.numPools);
const pools: Pool[] = poolTeamIds.map((ids, i) => ({ id: `pool${i + 1}`, name: `Poule ${i + 1}`, teamIds: ids }));
console.log("Pool sizes:", pools.map((p) => p.teamIds.length));

const poolMatchDrafts = buildPoolMatches({ pools, settings });
const finishedMatches: Match[] = poolMatchDrafts.map((m, i) => {
  const aNum = parseInt(m.teamAId!.replace("team", ""));
  const bNum = parseInt(m.teamBId!.replace("team", ""));
  const winnerId = aNum < bNum ? m.teamAId : m.teamBId;
  return { ...m, id: `pm${i}`, winnerId, winnerKubbsLeft: 5 } as Match;
});

const standingsByPool: Record<string, Standing[]> = {};
for (const pool of pools) {
  standingsByPool[pool.id] = calculatePoolStandings(pool.teamIds, finishedMatches, settings);
}

const qualifiersPerPool = Math.max(1, Math.min(settings.qualifiersPerPool, ...pools.map((p) => p.teamIds.length)));
const seeding = getOverallSeeding(pools, standingsByPool, qualifiersPerPool);
console.log("Qualifier seeding:", seeding);

const rankIndexes = getClassificationRankIndexes(pools, qualifiersPerPool);
console.log("Classification rank indexes (0-based):", rankIndexes);

const classificationGroups: BracketGroup[] = rankIndexes
  .map((rankIndex) => ({
    seededTeamIds: getRankGroupTeams(pools, standingsByPool, rankIndex),
    classificationRank: rankIndex + 1,
    labelPrefix: `Kruisfinale om plaats ${rankIndex + 1}`,
  }))
  .filter((g) => g.seededTeamIds.length > 0);

for (const g of classificationGroups) {
  console.log(`Group rank ${g.classificationRank}:`, g.seededTeamIds);
}

const startTime = new Date(settings.knockoutStartTime!);
const { matches: classificationMatches, slotsUsed } = scheduleBracketGroups(
  classificationGroups,
  settings,
  startTime,
  0,
  "class-"
);
console.log(`Classification matches: ${classificationMatches.length}, slotsUsed: ${slotsUsed}`);

const { matches: mainMatches } = scheduleBracketGroups(
  [{ seededTeamIds: seeding, classificationRank: null, labelPrefix: null }],
  settings,
  startTime,
  slotsUsed,
  "main-"
);
console.log(`Main knockout matches: ${mainMatches.length}`);

// Sanity: main knockout matches must start no earlier than classification matches finish.
const classificationTimes = classificationMatches.map((m) => new Date(m.startTime).getTime());
const mainTimes = mainMatches.map((m) => new Date(m.startTime).getTime());
if (Math.min(...mainTimes) < Math.max(...classificationTimes)) {
  throw new Error("Main knockout starts before classification finishes!");
}
console.log("Main knockout correctly starts after classification. OK");

// Verify tempIds are all unique across both scheduling calls (no collisions).
const allTempIds = [...classificationMatches.map((m) => m.tempId), ...mainMatches.map((m) => m.tempId)];
if (new Set(allTempIds).size !== allTempIds.length) {
  throw new Error("Duplicate tempIds detected across classification/main matches!");
}
console.log("All tempIds unique. OK");

// Simulate all classification + knockout results (lower team number always wins) and check final ranking.
function simulateAndResolve(drafts: typeof classificationMatches, idPrefix: string): Match[] {
  const withIds: Match[] = drafts.map((m, i) => ({ ...m, id: `${idPrefix}${i}`, nextMatchId: null }));
  const tempToReal = new Map(withIds.map((m, i) => [drafts[i].tempId, m.id]));
  withIds.forEach((m, i) => {
    m.nextMatchId = drafts[i].nextTempId ? tempToReal.get(drafts[i].nextTempId!) ?? null : null;
  });
  // Resolve round by round using round number.
  const byRound = new Map<number, Match[]>();
  for (const m of withIds) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (const r of rounds) {
    for (const m of byRound.get(r)!) {
      if (!m.teamAId || !m.teamBId) continue;
      const aNum = parseInt(m.teamAId.replace("team", ""));
      const bNum = parseInt(m.teamBId.replace("team", ""));
      const winnerId = aNum < bNum ? m.teamAId : m.teamBId;
      m.winnerId = winnerId;
      if (m.nextMatchId && m.nextMatchSlot) {
        const next = withIds.find((x) => x.id === m.nextMatchId)!;
        if (m.nextMatchSlot === "A") next.teamAId = winnerId;
        else next.teamBId = winnerId;
      }
    }
  }
  return withIds;
}

const resolvedClassification = simulateAndResolve(classificationMatches, "cm");
const resolvedMain = simulateAndResolve(mainMatches, "mm");

const allResolved = [...finishedMatches, ...resolvedClassification, ...resolvedMain];
const ranking = computeFinalRanking(pools, standingsByPool, qualifiersPerPool, allResolved);
console.log("\nFinal ranking:");
for (const row of ranking) {
  console.log(`  ${row.rankLabel}: ${row.teamIds.join(", ")}`);
}

const allRankedTeams = ranking.flatMap((r) => r.teamIds);
if (new Set(allRankedTeams).size !== allRankedTeams.length) {
  throw new Error("A team appears more than once in the final ranking!");
}
if (allRankedTeams.length !== teamIds.length) {
  throw new Error(`Expected ${teamIds.length} teams in final ranking, got ${allRankedTeams.length}`);
}
console.log(`\nAll ${teamIds.length} teams appear exactly once in the final ranking. OK`);
console.log("\nAll classification checks passed!");
