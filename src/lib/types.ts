// Gedeelde TypeScript types voor het kubb-toernooi systeem.

export type TournamentStatus = "setup" | "pools_generated" | "knockout_generated";

export interface TournamentSettings {
  numPools: number; // aantal poules
  qualifiersPerPool: number; // aantal teams per poule dat doorgaat naar knock-out
  numLanes: number; // aantal kubb-banen
  matchDurationMinutes: number; // duur van een tijdslot in minuten
  poolsStartTime: string; // ISO datetime, starttijd van de poulefase
  knockoutStartTime?: string | null; // ISO datetime, starttijd van de knock-outfase
  pointsPerWin: number; // punten per gewonnen wedstrijd in de poulefase
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: string;
  settings: TournamentSettings;
  status: TournamentStatus;
}

export interface Team {
  id: string;
  name: string;
  players: string[];
  poolId?: string | null;
}

export interface Pool {
  id: string;
  name: string;
  teamIds: string[];
}

export type MatchStage = "pool" | "knockout" | "classification";
export type NextMatchSlot = "A" | "B";

export interface Match {
  id: string;
  stage: MatchStage;
  poolId?: string | null;
  // Voor stage "classification": de poule-rang (1-gebaseerd, bv. 3 voor "alle 3des") die deze
  // kruisfinale-bracket vertegenwoordigt. Null/undefined voor "pool" en "knockout" wedstrijden.
  classificationRank?: number | null;
  round: number; // volgnummer van de ronde binnen de fase (1-gebaseerd)
  roundLabel?: string | null; // bv. "Kwartfinale", "Halve finale", "Finale", of "Kruisfinale om plaats 3 — Finale"
  lane: number; // baannummer (1-gebaseerd)
  startTime: string; // ISO datetime
  teamAId: string | null; // null = nog niet bekend (wacht op vorige ronde) of bye
  teamBId: string | null;
  teamAIsBye?: boolean;
  teamBIsBye?: boolean;
  winnerId?: string | null;
  winnerKubbsLeft?: number | null;
  wonByKing?: boolean;
  nextMatchId?: string | null;
  nextMatchSlot?: NextMatchSlot | null;
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  kubbsLeftTotal: number;
}
