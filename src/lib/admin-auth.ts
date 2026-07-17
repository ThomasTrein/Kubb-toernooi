"use client";

// Eenvoudige PIN-gate voor het admin-gedeelte. Dit is BEWUST simpel gehouden
// (geen volwaardig account-systeem) op verzoek. Na een correcte PIN loggen we
// anoniem in via Firebase Authentication, zodat de Firestore-regels schrijven
// alleen toestaan voor "geauthenticeerde" sessies. Zie README.md voor de
// veiligheidsafweging die hierbij hoort.
import { signInAnonymously, signOut } from "firebase/auth";
import { auth } from "./firebase";

const SESSION_KEY = "kubb-admin-authenticated";

export function checkPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN;
  return !!expected && pin === expected;
}

export async function loginWithPin(pin: string): Promise<boolean> {
  if (!checkPin(pin)) return false;
  await signInAnonymously(auth);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, "true");
  }
  return true;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

export async function logoutAdmin() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
  await signOut(auth);
}

