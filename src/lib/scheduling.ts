// Kernlogica voor poule-indeling, wedstrijdschema, standenberekening en knock-out bracket.
import type { Match, Pool, Standing, Team, TournamentSettings } from "./types";

/** Fisher-Yates shuffle, retourneert een nieuwe array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Verdeel teams willekeurig en zo gelijk mogelijk over N poules (snake-verdeling).
 */
export function distributeTeamsIntoPools(teamIds: string[], numPools: number): string[][] {
  const shuffled = shuffle(teamIds);
  const pools: string[][] = Array.from({ length: numPools }, () => []);
  shuffled.forEach((teamId, index) => {
    pools[index % numPools].push(teamId);
  });
  return pools;
}

const BYE = "__BYE__";

/**
 * Genereert een round-robin schema (circle method) voor een lijst teams.
 * Retourneert een array van rondes; elke ronde is een array van [teamA, teamB] paren.
 * Bij een oneven aantal teams krijgt een team per ronde een vrije ronde (bye), er wordt dan geen wedstrijd voor gemaakt.
 */
export function generateRoundRobinRounds(teamIds: string[]): [string, string][][] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 !== 0) teams.push(BYE);

  const n = teams.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds: [string, string][][] = [];

  let arr = [...teams];
  for (let r = 0; r < numRounds; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const teamA = arr[i];
      const teamB = arr[n - 1 - i];
      if (teamA !== BYE && teamB !== BYE) {
        round.push([teamA, teamB]);
      }
    }
    rounds.push(round);
    // Roteer alle teams behalve de eerste (standaard circle method)
    arr = [arr[0], ...arr.slice(-1), ...arr.slice(1, -1)];
  }
  return rounds;
}

interface BuildPoolMatchesInput {
  pools: Pool[];
  settings: TournamentSettings;
}

/**
 * Bouwt alle poulewedstrijden voor een toernooi, verdeeld over banen en tijdsloten.
 * Poules draaien parallel: ronde-index r van elke poule wordt gecombineerd tot een
 * "superronde" die vervolgens over de beschikbare banen wordt verdeeld.
 */
export function buildPoolMatches({ pools, settings }: BuildPoolMatchesInput): Omit<Match, "id">[] {
  const { numLanes, matchDurationMinutes, poolsStartTime } = settings;
  const startTime = new Date(poolsStartTime);

  const poolRounds = pools.map((pool) => ({
    poolId: pool.id,
    rounds: generateRoundRobinRounds(pool.teamIds),
  }));

  const maxRounds = Math.max(0, ...poolRounds.map((p) => p.rounds.length));
  const matches: Omit<Match, "id">[] = [];
  let slotIndex = 0; // globale tijdslot-teller

  for (let r = 0; r < maxRounds; r++) {
    // Verzamel alle wedstrijden van deze poule-ronde over alle poules heen.
    const superRoundMatches: { poolId: string; teamAId: string; teamBId: string }[] = [];
    for (const p of poolRounds) {
      const round = p.rounds[r];
      if (!round) continue;
      for (const [teamAId, teamBId] of round) {
        superRoundMatches.push({ poolId: p.poolId, teamAId, teamBId });
      }
    }
    // Verdeel deze superronde over banen; als er meer wedstrijden zijn dan banen,
    // gebruiken we meerdere opeenvolgende tijdsloten.
    for (let i = 0; i < superRoundMatches.length; i += numLanes) {
      const batch = superRoundMatches.slice(i, i + numLanes);
      const slotStart = new Date(startTime.getTime() + slotIndex * matchDurationMinutes * 60000);
      batch.forEach((m, laneIdx) => {
        matches.push({
          stage: "pool",
          poolId: m.poolId,
          round: r + 1,
          roundLabel: `Ronde ${r + 1}`,
          lane: laneIdx + 1,
          startTime: slotStart.toISOString(),
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerId: null,
          winnerKubbsLeft: null,
          wonByKing: false,
          nextMatchId: null,
          nextMatchSlot: null,
        });
      });
      slotIndex++;
    }
  }

  return matches;
}

/**
 * Berekent de poulestand op basis van afgeronde wedstrijden.
 * Sortering: punten desc -> onderling resultaat (bij exact 2 gelijk-staande teams) -> overgebleven kubbs desc.
 */
export function calculatePoolStandings(
  teamIds: string[],
  matches: Match[],
  settings: TournamentSettings
): Standing[] {
  const standings = new Map<string, Standing>();
  for (const teamId of teamIds) {
    standings.set(teamId, { teamId, played: 0, won: 0, lost: 0, points: 0, kubbsLeftTotal: 0 });
  }

  const finished = matches.filter((m) => m.stage === "pool" && m.winnerId);
  for (const m of finished) {
    const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
    const winner = standings.get(m.winnerId!);
    const loser = loserId ? standings.get(loserId) : undefined;
    if (winner) {
      winner.played++;
      winner.won++;
      winner.points += settings.pointsPerWin;
      winner.kubbsLeftTotal += m.winnerKubbsLeft ?? 0;
    }
    if (loser) {
      loser.played++;
      loser.lost++;
    }
  }

  const list = Array.from(standings.values());

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Onderling resultaat: alleen toepasbaar als a en b exact 1x tegen elkaar speelden.
    const headToHead = finished.find(
      (m) =>
        (m.teamAId === a.teamId && m.teamBId === b.teamId) ||
        (m.teamAId === b.teamId && m.teamBId === a.teamId)
    );
    if (headToHead && headToHead.winnerId) {
      if (headToHead.winnerId === a.teamId) return -1;
      if (headToHead.winnerId === b.teamId) return 1;
    }
    if (b.kubbsLeftTotal !== a.kubbsLeftTotal) return b.kubbsLeftTotal - a.kubbsLeftTotal;
    return 0;
  });

  return list;
}

/**
 * Geeft, voor één specifieke poule-rang (0-gebaseerd: 0 = alle poule-winnaars, 1 = alle
 * nummers 2, ...), de teams die op die rang staan over alle poules heen, gerangschikt op
 * sterkte (punten -> overgebleven kubbs). Poules die geen team op deze rang hebben (bv. een
 * kleinere poule) leveren gewoon geen kandidaat.
 */
export function getRankGroupTeams(
  pools: Pool[],
  standingsByPool: Record<string, Standing[]>,
  rankIndex: number
): string[] {
  const rankTeams = pools
    .map((pool) => {
      const standing = standingsByPool[pool.id]?.[rankIndex];
      return standing ? { teamId: standing.teamId, points: standing.points, kubbs: standing.kubbsLeftTotal } : null;
    })
    .filter((x): x is { teamId: string; points: number; kubbs: number } => x !== null);
  rankTeams.sort((a, b) => (b.points !== a.points ? b.points - a.points : b.kubbs - a.kubbs));
  return rankTeams.map((t) => t.teamId);
}

/**
 * Bepaalt de overall seeding-volgorde van gekwalificeerde teams over alle poules heen:
 * eerst alle poule-winnaars (gerangschikt op sterkte), dan alle nummers 2, enzovoort.
 */
export function getOverallSeeding(
  pools: Pool[],
  standingsByPool: Record<string, Standing[]>,
  qualifiersPerPool: number
): string[] {
  const seeding: string[] = [];
  for (let rank = 0; rank < qualifiersPerPool; rank++) {
    seeding.push(...getRankGroupTeams(pools, standingsByPool, rank));
  }
  return seeding;
}

/**
 * Geeft de 0-gebaseerde poule-rangen die NIET meer kwalificeren voor de hoofd-knockout, maar
 * waarvoor nog wel teams overblijven (bv. rang 2 en 3 (0-gebaseerd) = "alle 3des"/"alle 4des"
 * bij qualifiersPerPool = 2). Rangen zonder overblijvende teams (nooit voorkomend, maar
 * defensief) worden er verderop uitgefilterd door de aanroeper.
 */
export function getClassificationRankIndexes(pools: Pool[], qualifiersPerPool: number): number[] {
  const maxPoolSize = Math.max(0, ...pools.map((p) => p.teamIds.length));
  const ranks: number[] = [];
  for (let r = qualifiersPerPool; r < maxPoolSize; r++) ranks.push(r);
  return ranks;
}

/** Genereert de standaard toernooi-seedingvolgorde (bv. 1,8,4,5,2,7,3,6 voor n=8). */
function standardSeedOrder(n: number): number[] {
  let result = [1, 2];
  while (result.length < n) {
    const m = result.length * 2 + 1;
    const next: number[] = [];
    for (const r of result) {
      next.push(r, m - r);
    }
    result = next;
  }
  return result;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundLabelFor(roundsFromFinal: number): string {
  if (roundsFromFinal === 0) return "Finale";
  if (roundsFromFinal === 1) return "Halve finale";
  if (roundsFromFinal === 2) return "Kwartfinale";
  return `Ronde van ${Math.pow(2, roundsFromFinal + 1)}`;
}

interface KnockoutBuildResult {
  matches: (Omit<Match, "id" | "nextMatchId"> & { tempId: string; nextTempId: string | null })[];
}

type MatchDraft = {
  tempId: string;
  round: number; // 1-gebaseerd, laag = vroege ronde
  teamAId: string | null;
  teamBId: string | null;
  leftSourceTempId: string | null;
  rightSourceTempId: string | null;
};

interface SubtreeResult {
  hasRealTeam: boolean;
  /** Bekend team-id als deze subboom al vaststaat (bv. door bye's), anders null (wacht op een echte wedstrijd). */
  resolvedTeam: string | null;
  /** tempId van de wedstrijd waarvan de winnaar deze subboom bepaalt, als resolvedTeam nog null is. */
  outputTempId: string | null;
}

/**
 * Recursief: een subboom van `seeds` (lengte = macht van 2) levert ofwel direct een vaststaand
 * team (als de rest van de subboom volledig uit byes bestaat), ofwel een echte wedstrijd die nog
 * gespeeld moet worden. Zo worden bye-doorschuivingen automatisch "gecomprimeerd" zonder valse
 * "vs BYE"-wedstrijden te tonen voor ronden die feitelijk nog niet gespeeld kunnen worden.
 */
function resolveSubtree(
  seeds: number[],
  seedToTeam: (seed: number) => string | null,
  matches: MatchDraft[],
  counter: { n: number }
): SubtreeResult {
  if (seeds.length === 1) {
    const team = seedToTeam(seeds[0]);
    return { hasRealTeam: team !== null, resolvedTeam: team, outputTempId: null };
  }

  const mid = seeds.length / 2;
  const left = resolveSubtree(seeds.slice(0, mid), seedToTeam, matches, counter);
  const right = resolveSubtree(seeds.slice(mid), seedToTeam, matches, counter);

  if (left.hasRealTeam && !right.hasRealTeam) return left;
  if (!left.hasRealTeam && right.hasRealTeam) return right;
  if (!left.hasRealTeam && !right.hasRealTeam) {
    return { hasRealTeam: false, resolvedTeam: null, outputTempId: null };
  }

  // Beide kanten hebben een echt team: dit is een te spelen wedstrijd.
  const round = Math.log2(seeds.length);
  const tempId = `m${counter.n++}`;
  matches.push({
    tempId,
    round,
    teamAId: left.resolvedTeam,
    teamBId: right.resolvedTeam,
    leftSourceTempId: left.outputTempId,
    rightSourceTempId: right.outputTempId,
  });
  return { hasRealTeam: true, resolvedTeam: null, outputTempId: tempId };
}

interface BracketStructure {
  drafts: MatchDraft[];
  /** Aantal rondes van deze bracket (1 = enkel een finale, 2 = halve finale + finale, ...). */
  totalRounds: number;
}

/**
 * Bouwt enkel de *structuur* (paringen + rondes, zonder tijd/baan) van een knock-out bracket op
 * basis van de geseede teams. Voegt automatisch "byes" toe voor de beste teams als het aantal
 * geen macht van 2 is, en comprimeert bye-doorschuivingen (zie `resolveSubtree`).
 */
function buildBracketStructure(seededTeamIds: string[]): BracketStructure {
  const qualifiedCount = seededTeamIds.length;
  const bracketSize = nextPowerOfTwo(Math.max(qualifiedCount, 2));
  const seedOrder = standardSeedOrder(bracketSize);
  const totalRounds = Math.log2(bracketSize);

  // Seed -> teamId, of null als het een bye-slot is (seed groter dan aantal gekwalificeerde teams)
  const seedToTeam = (seed: number): string | null =>
    seed <= qualifiedCount ? seededTeamIds[seed - 1] : null;

  const drafts: MatchDraft[] = [];
  resolveSubtree(seedOrder, seedToTeam, drafts, { n: 1 });
  return { drafts, totalRounds };
}

export interface BracketGroup {
  /** Teams in seeding-volgorde voor deze bracket (hoofd-knockout of één kruisfinale-groep). */
  seededTeamIds: string[];
  /** Null voor de hoofd-knockout, anders de 1-gebaseerde poule-rang (bv. 3 voor "alle 3des"). */
  classificationRank: number | null;
  /** Label die voor elke ronde-naam van deze bracket geplaatst wordt, bv. "Kruisfinale om plaats 3". */
  labelPrefix: string | null;
}

/**
 * Plant één of meerdere brackets (bv. de hoofd-knockout, of meerdere kruisfinale-groepen) samen
 * in: wedstrijden van dezelfde (bracket-eigen) rondenummer worden samengevoegd tot "superrondes"
 * die over de beschikbare banen/tijdsloten verdeeld worden — net zoals de poulefase parallelle
 * poules plant. Zo lopen bv. de kruisfinale van de 3des en die van de 4des gelijktijdig door
 * elkaar. Geeft ook terug hoeveel tijdsloten er in totaal gebruikt zijn, zodat een volgende fase
 * (bv. de hoofd-knockout) daarna pas kan starten.
 */
export function scheduleBracketGroups(
  groups: BracketGroup[],
  settings: TournamentSettings,
  startTime: Date,
  startSlotIndex = 0,
  tempIdPrefix = ""
): {
  matches: (Omit<Match, "id" | "nextMatchId"> & { tempId: string; nextTempId: string | null })[];
  slotsUsed: number;
} {
  const { numLanes, matchDurationMinutes } = settings;

  type CombinedDraft = MatchDraft & { label: string; classificationRank: number | null };
  const combined: CombinedDraft[] = [];

  groups.forEach((group, groupIndex) => {
    const { drafts, totalRounds } = buildBracketStructure(group.seededTeamIds);
    const prefix = `${tempIdPrefix}g${groupIndex}-`;
    for (const d of drafts) {
      const roundsFromFinal = totalRounds - d.round;
      const label = group.labelPrefix
        ? `${group.labelPrefix} — ${roundLabelFor(roundsFromFinal)}`
        : roundLabelFor(roundsFromFinal);
      combined.push({
        ...d,
        tempId: prefix + d.tempId,
        leftSourceTempId: d.leftSourceTempId ? prefix + d.leftSourceTempId : null,
        rightSourceTempId: d.rightSourceTempId ? prefix + d.rightSourceTempId : null,
        label,
        classificationRank: group.classificationRank,
      });
    }
  });

  // Koppel elke wedstrijd aan de wedstrijd die haar teamA/teamB slot invult (indien nog niet bekend).
  const nextInfo = new Map<string, { nextTempId: string; slot: "A" | "B" }>();
  for (const m of combined) {
    if (m.leftSourceTempId) nextInfo.set(m.leftSourceTempId, { nextTempId: m.tempId, slot: "A" });
    if (m.rightSourceTempId) nextInfo.set(m.rightSourceTempId, { nextTempId: m.tempId, slot: "B" });
  }

  // Groepeer per (bracket-eigen) rondenummer over alle groups heen en verdeel over banen/tijdsloten.
  const byRound = new Map<number, CombinedDraft[]>();
  for (const m of combined) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }

  const allMatches: (Omit<Match, "id" | "nextMatchId"> & { tempId: string; nextTempId: string | null })[] = [];
  let slotIndex = startSlotIndex;
  const sortedRounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (const round of sortedRounds) {
    const roundMatches = byRound.get(round)!;
    for (let i = 0; i < roundMatches.length; i += numLanes) {
      const batch = roundMatches.slice(i, i + numLanes);
      const slotStart = new Date(startTime.getTime() + slotIndex * matchDurationMinutes * 60000);
      batch.forEach((m, laneIdx) => {
        const next = nextInfo.get(m.tempId);
        allMatches.push({
          tempId: m.tempId,
          stage: m.classificationRank ? "classification" : "knockout",
          poolId: null,
          classificationRank: m.classificationRank,
          round: m.round,
          roundLabel: m.label,
          lane: laneIdx + 1,
          startTime: slotStart.toISOString(),
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          teamAIsBye: false,
          teamBIsBye: false,
          winnerId: null,
          winnerKubbsLeft: null,
          wonByKing: false,
          nextTempId: next?.nextTempId ?? null,
          nextMatchSlot: next?.slot ?? null,
        });
      });
      slotIndex++;
    }
  }

  return { matches: allMatches, slotsUsed: slotIndex - startSlotIndex };
}

/**
 * Bouwt de volledige knock-out bracket op basis van de gekwalificeerde teams (in seeding-volgorde).
 * Blijft bestaan als eenvoudige wrapper rond `scheduleBracketGroups` voor één enkele bracket
 * (backwards compatible met bestaand gebruik/tests).
 */
export function buildKnockoutBracket(
  seededTeamIds: string[],
  settings: TournamentSettings
): KnockoutBuildResult {
  const { knockoutStartTime, poolsStartTime } = settings;
  const startTime = new Date(knockoutStartTime || poolsStartTime);
  const { matches } = scheduleBracketGroups(
    [{ seededTeamIds, classificationRank: null, labelPrefix: null }],
    settings,
    startTime
  );
  return { matches };
}

export function getTeamName(teams: Team[], teamId: string | null | undefined): string {
  if (!teamId) return "TBD";
  return teams.find((t) => t.id === teamId)?.name ?? "Onbekend team";
}

export interface RankingRow {
  /** bv. "1e", "5e-8e", of "Nog bezig" voor teams die deze bracket nog niet af hebben. */
  rankLabel: string;
  teamIds: string[];
  pending?: boolean;
}

interface RelativeBand {
  rankStart: number;
  rankEnd: number;
  teamIds: string[];
  pending?: boolean;
}

/**
 * Bepaalt, voor één bracket (hoofd-knockout of één kruisfinale-groep), de relatieve plaatsen
 * (1-gebaseerd t.o.v. deze bracket) van elk team op basis van in welke ronde het verloor.
 * Teams die in dezelfde ronde verliezen (bv. beide halve-finaleverliezers) delen een plaatsenband
 * (bv. 3-4). Teams die nog niet uitgeschakeld zijn (en nog geen kampioen) komen in een "pending"
 * band terecht.
 */
function computeBracketBandsRelative(teamIds: string[], groupMatches: Match[]): RelativeBand[] {
  const n = teamIds.length;
  if (n === 0) return [];
  if (n === 1) return [{ rankStart: 1, rankEnd: 1, teamIds: [...teamIds] }];

  const bracketSize = nextPowerOfTwo(n);
  const totalRounds = Math.log2(bracketSize);

  const bandsMap = new Map<number, string[]>();
  const placed = new Set<string>();

  for (const m of groupMatches) {
    if (!m.winnerId) continue;
    const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
    const roundsFromFinal = totalRounds - m.round;
    if (roundsFromFinal === 0) {
      bandsMap.set(1, [m.winnerId]);
      placed.add(m.winnerId);
      if (loserId) {
        bandsMap.set(2, [...(bandsMap.get(2) ?? []), loserId]);
        placed.add(loserId);
      }
    } else if (loserId) {
      const bandSize = Math.pow(2, roundsFromFinal);
      const rankStart = bandSize + 1;
      bandsMap.set(rankStart, [...(bandsMap.get(rankStart) ?? []), loserId]);
      placed.add(loserId);
    }
  }

  const bands: RelativeBand[] = Array.from(bandsMap.entries())
    .map(([rankStart, ids]) => ({ rankStart, rankEnd: rankStart + ids.length - 1, teamIds: ids }))
    .sort((a, b) => a.rankStart - b.rankStart);

  const remaining = teamIds.filter((t) => !placed.has(t));
  if (remaining.length > 0) {
    bands.push({ rankStart: -1, rankEnd: -1, teamIds: remaining, pending: true });
  }
  return bands;
}

function ordinalNl(n: number): string {
  return `${n}e`;
}

/**
 * Berekent de volledige eindranglijst van het toernooi: eerst de plaatsen uit de hoofd-knockout
 * (de gekwalificeerde teams), daarna per niet-gekwalificeerde poule-rang (bv. alle 3des, dan alle
 * 4des) het volledige blok van die kruisfinale-bracket. Teams die in dezelfde ronde verliezen
 * delen een plaatsenband (bv. "5e-8e").
 */
export function computeFinalRanking(
  pools: Pool[],
  standingsByPool: Record<string, Standing[]>,
  qualifiersPerPool: number,
  matches: Match[]
): RankingRow[] {
  const rows: RankingRow[] = [];
  let offset = 0;

  const toRow = (b: RelativeBand): RankingRow => {
    if (b.pending) return { rankLabel: "Nog bezig", teamIds: b.teamIds, pending: true };
    const start = offset + b.rankStart;
    const end = offset + b.rankEnd;
    const rankLabel = start === end ? ordinalNl(start) : `${ordinalNl(start)}-${ordinalNl(end)}`;
    return { rankLabel, teamIds: b.teamIds };
  };

  const qualifierSeeding = getOverallSeeding(pools, standingsByPool, qualifiersPerPool);
  if (qualifierSeeding.length > 0) {
    const knockoutMatches = matches.filter((m) => m.stage === "knockout");
    for (const band of computeBracketBandsRelative(qualifierSeeding, knockoutMatches)) {
      rows.push(toRow(band));
    }
    offset += qualifierSeeding.length;
  }

  const rankIndexes = getClassificationRankIndexes(pools, qualifiersPerPool);
  for (const rankIndex of rankIndexes) {
    const groupTeams = getRankGroupTeams(pools, standingsByPool, rankIndex);
    if (groupTeams.length === 0) continue;
    const groupMatches = matches.filter(
      (m) => m.stage === "classification" && m.classificationRank === rankIndex + 1
    );
    for (const band of computeBracketBandsRelative(groupTeams, groupMatches)) {
      rows.push(toRow(band));
    }
    offset += groupTeams.length;
  }

  return rows;
}
