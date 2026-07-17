// Firestore data-access laag: alle CRUD- en realtime-functies voor toernooien, teams,
// poules en wedstrijden. Dit is de enige plek die rechtstreeks met Firestore praat.
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, Pool, Team, Tournament, TournamentSettings, Standing } from "./types";
import {
  distributeTeamsIntoPools,
  buildPoolMatches,
  calculatePoolStandings,
  getOverallSeeding,
  buildKnockoutBracket,
} from "./scheduling";

const tournamentsCol = () => collection(db, "tournaments");
const teamsCol = (tId: string) => collection(db, "tournaments", tId, "teams");
const poolsCol = (tId: string) => collection(db, "tournaments", tId, "pools");
const matchesCol = (tId: string) => collection(db, "tournaments", tId, "matches");

// ---------- Toernooien ----------

export const DEFAULT_SETTINGS: TournamentSettings = {
  numPools: 4,
  qualifiersPerPool: 2,
  numLanes: 4,
  matchDurationMinutes: 25,
  poolsStartTime: new Date().toISOString().slice(0, 16),
  knockoutStartTime: null,
  pointsPerWin: 3,
};

export async function createTournament(name: string, settings: TournamentSettings): Promise<string> {
  const ref = await addDoc(tournamentsCol(), {
    name,
    createdAt: new Date().toISOString(),
    settings,
    status: "setup",
  });
  return ref.id;
}

export function subscribeTournaments(cb: (tournaments: Tournament[]) => void): Unsubscribe {
  const q = query(tournamentsCol(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)));
  });
}

export function subscribeTournament(tId: string, cb: (t: Tournament | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "tournaments", tId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Tournament) : null);
  });
}

export async function getTournament(tId: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, "tournaments", tId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Tournament) : null;
}

export async function updateTournamentSettings(tId: string, settings: TournamentSettings) {
  await updateDoc(doc(db, "tournaments", tId), { settings });
}

export async function renameTournament(tId: string, name: string) {
  await updateDoc(doc(db, "tournaments", tId), { name });
}

export async function deleteTournament(tId: string) {
  const batch = writeBatch(db);
  for (const col of [teamsCol(tId), poolsCol(tId), matchesCol(tId)]) {
    const snap = await getDocs(col);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  batch.delete(doc(db, "tournaments", tId));
  await batch.commit();
}

// ---------- Teams ----------

export function subscribeTeams(tId: string, cb: (teams: Team[]) => void): Unsubscribe {
  return onSnapshot(teamsCol(tId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team)));
  });
}

export async function addTeam(tId: string, name: string, players: string[]) {
  await addDoc(teamsCol(tId), { name, players, poolId: null });
}

export async function updateTeam(tId: string, teamId: string, name: string, players: string[]) {
  await updateDoc(doc(db, "tournaments", tId, "teams", teamId), { name, players });
}

export async function deleteTeam(tId: string, teamId: string) {
  await deleteDoc(doc(db, "tournaments", tId, "teams", teamId));
}

// ---------- Poules & wedstrijden ----------

export function subscribePools(tId: string, cb: (pools: Pool[]) => void): Unsubscribe {
  return onSnapshot(poolsCol(tId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pool)));
  });
}

export function subscribeMatches(tId: string, cb: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(matchesCol(tId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
  });
}

/**
 * Genereert (of hergenereert) de poule-indeling en het volledige poule-wedstrijdschema.
 * Verwijdert eerdere poules/wedstrijden van dit toernooi.
 */
export async function generatePoolsAndSchedule(tId: string, teams: Team[], settings: TournamentSettings) {
  const batch = writeBatch(db);

  // Ruim oude poules en wedstrijden op.
  const [oldPools, oldMatches] = await Promise.all([getDocs(poolsCol(tId)), getDocs(matchesCol(tId))]);
  oldPools.docs.forEach((d) => batch.delete(d.ref));
  oldMatches.docs.forEach((d) => batch.delete(d.ref));

  const numPools = Math.max(1, Math.min(settings.numPools, teams.length));
  const distributed = distributeTeamsIntoPools(
    teams.map((t) => t.id),
    numPools
  );

  const poolNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pools: Pool[] = distributed.map((teamIds, i) => ({
    id: doc(poolsCol(tId)).id,
    name: `Poule ${poolNames[i] ?? i + 1}`,
    teamIds,
  }));

  pools.forEach((pool) => {
    batch.set(doc(db, "tournaments", tId, "pools", pool.id), { name: pool.name, teamIds: pool.teamIds });
  });
  // Werk poolId bij op elk team.
  for (const pool of pools) {
    for (const teamId of pool.teamIds) {
      batch.update(doc(db, "tournaments", tId, "teams", teamId), { poolId: pool.id });
    }
  }

  const matches = buildPoolMatches({ pools, settings });
  matches.forEach((m) => {
    const ref = doc(matchesCol(tId));
    batch.set(ref, m);
  });

  batch.update(doc(db, "tournaments", tId), { status: "pools_generated", settings });
  await batch.commit();
}

/**
 * Genereert de knock-outfase op basis van de huidige poulestanden.
 * Verwijdert een eerder gegenereerde knock-out fase van dit toernooi.
 */
export async function generateKnockoutStage(
  tId: string,
  teams: Team[],
  pools: Pool[],
  matches: Match[],
  settings: TournamentSettings
) {
  const standingsByPool: Record<string, Standing[]> = {};
  for (const pool of pools) {
    standingsByPool[pool.id] = calculatePoolStandings(pool.teamIds, matches, settings);
  }
  const qualifiersPerPool = Math.max(
    1,
    Math.min(settings.qualifiersPerPool, ...pools.map((p) => p.teamIds.length))
  );
  const seeding = getOverallSeeding(pools, standingsByPool, qualifiersPerPool);
  const { matches: draftMatches } = buildKnockoutBracket(seeding, settings);

  const batch = writeBatch(db);
  const oldKnockout = matches.filter((m) => m.stage === "knockout");
  oldKnockout.forEach((m) => batch.delete(doc(db, "tournaments", tId, "matches", m.id)));

  const tempIdToRealId = new Map<string, string>();
  draftMatches.forEach((m) => {
    tempIdToRealId.set(m.tempId, doc(matchesCol(tId)).id);
  });

  draftMatches.forEach((m) => {
    const realId = tempIdToRealId.get(m.tempId)!;
    const nextMatchId = m.nextTempId ? tempIdToRealId.get(m.nextTempId) ?? null : null;
    const { tempId, nextTempId, ...rest } = m;
    void tempId;
    void nextTempId;
    batch.set(doc(db, "tournaments", tId, "matches", realId), { ...rest, nextMatchId });
  });

  batch.update(doc(db, "tournaments", tId), { status: "knockout_generated" });
  await batch.commit();
}

/**
 * Legt de uitslag van een wedstrijd vast en schuift de winnaar (indien van toepassing)
 * automatisch door naar het volgende knock-out duel.
 */
export async function recordMatchResult(
  tId: string,
  match: Match,
  winnerId: string,
  winnerKubbsLeft: number | null,
  wonByKing: boolean
) {
  const batch = writeBatch(db);
  batch.update(doc(db, "tournaments", tId, "matches", match.id), {
    winnerId,
    winnerKubbsLeft,
    wonByKing,
  });
  if (match.nextMatchId && match.nextMatchSlot) {
    const field = match.nextMatchSlot === "A" ? "teamAId" : "teamBId";
    batch.update(doc(db, "tournaments", tId, "matches", match.nextMatchId), { [field]: winnerId });
  }
  await batch.commit();
}

export async function clearMatchResult(tId: string, match: Match) {
  const batch = writeBatch(db);
  batch.update(doc(db, "tournaments", tId, "matches", match.id), {
    winnerId: null,
    winnerKubbsLeft: null,
    wonByKing: false,
  });
  if (match.nextMatchId && match.nextMatchSlot) {
    const field = match.nextMatchSlot === "A" ? "teamAId" : "teamBId";
    batch.update(doc(db, "tournaments", tId, "matches", match.nextMatchId), { [field]: null });
  }
  await batch.commit();
}

export async function updateMatchSchedule(tId: string, matchId: string, startTime: string, lane: number) {
  await updateDoc(doc(db, "tournaments", tId, "matches", matchId), { startTime, lane });
}
