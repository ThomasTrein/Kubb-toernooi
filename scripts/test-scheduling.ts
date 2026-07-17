import {
  distributeTeamsIntoPools,
  generateRoundRobinRounds,
  buildPoolMatches,
  calculatePoolStandings,
  getOverallSeeding,
  buildKnockoutBracket,
} from "../src/lib/scheduling";
import type { Pool, Match, TournamentSettings, Standing } from "../src/lib/types";

const settings: TournamentSettings = {
  numPools: 3,
  qualifiersPerPool: 2,
  numLanes: 2,
  matchDurationMinutes: 20,
  poolsStartTime: new Date().toISOString(),
  knockoutStartTime: new Date(Date.now() + 3600_000).toISOString(),
  pointsPerWin: 3,
};

const teamIds = Array.from({ length: 10 }, (_, i) => `team${i + 1}`);
const poolTeamIds = distributeTeamsIntoPools(teamIds, settings.numPools);
console.log("Pool sizes:", poolTeamIds.map((p) => p.length));

const pools: Pool[] = poolTeamIds.map((ids, i) => ({ id: `pool${i + 1}`, name: `Poule ${i + 1}`, teamIds: ids }));

// Test round robin: every team should play every other team in its pool exactly once.
for (const pool of pools) {
  const rounds = generateRoundRobinRounds(pool.teamIds);
  const pairsSeen = new Set<string>();
  for (const round of rounds) {
    const teamsThisRound = new Set<string>();
    for (const [a, b] of round) {
      if (teamsThisRound.has(a) || teamsThisRound.has(b)) throw new Error("Team double-booked in same round!");
      teamsThisRound.add(a);
      teamsThisRound.add(b);
      const key = [a, b].sort().join("-");
      if (pairsSeen.has(key)) throw new Error("Duplicate pairing: " + key);
      pairsSeen.add(key);
    }
  }
  const expectedPairs = (pool.teamIds.length * (pool.teamIds.length - 1)) / 2;
  if (pairsSeen.size !== expectedPairs) throw new Error(`Pool ${pool.id}: expected ${expectedPairs} pairs, got ${pairsSeen.size}`);
  console.log(`Pool ${pool.id} (${pool.teamIds.length} teams): ${pairsSeen.size} unique matches, OK`);
}

// Build pool matches with lanes/time slots
const matches = buildPoolMatches({ pools, settings });
console.log(`Total pool matches: ${matches.length}`);
const byTime = new Map<string, string[]>();
for (const m of matches) {
  const key = m.startTime;
  const arr = byTime.get(key) ?? [];
  arr.push(m.teamAId!, m.teamBId!);
  byTime.set(key, arr);
}
for (const [time, teams] of byTime) {
  const set = new Set(teams);
  if (set.size !== teams.length) throw new Error("Team double-booked at same time slot: " + time);
}
console.log("No team double-booked at any time slot. OK");

// Simulate results: lower-numbered team always wins (deterministic standings check)
const finishedMatches: Match[] = matches.map((m, i) => {
  const aNum = parseInt(m.teamAId!.replace("team", ""));
  const bNum = parseInt(m.teamBId!.replace("team", ""));
  const winnerId = aNum < bNum ? m.teamAId : m.teamBId;
  return { ...m, id: `m${i}`, winnerId, winnerKubbsLeft: 5 } as Match;
});

const standingsByPool: Record<string, Standing[]> = {};
for (const pool of pools) {
  standingsByPool[pool.id] = calculatePoolStandings(pool.teamIds, finishedMatches, settings);
  console.log(`Standings ${pool.id}:`, standingsByPool[pool.id].map((s) => `${s.teamId}(${s.points}p)`).join(", "));
}

const seeding = getOverallSeeding(pools, standingsByPool, settings.qualifiersPerPool);
console.log("Overall seeding:", seeding);

const bracket = buildKnockoutBracket(seeding, settings);
console.log(`Knockout matches: ${bracket.matches.length}`);
for (const m of bracket.matches) {
  console.log(
    `  [${m.roundLabel}] lane${m.lane} ${m.teamAId ?? "BYE"} vs ${m.teamBId ?? "BYE"} -> winner:${m.winnerId ?? "-"} next:${m.nextTempId}(${m.nextMatchSlot})`
  );
}

console.log("\nAll checks passed!");
