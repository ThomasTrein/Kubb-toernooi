# 🪵 Kubb Toernooi

Een website om een kubb-toernooi te organiseren en te volgen — vergelijkbaar met Tournify.
Bezoekers kunnen zonder in te loggen de poule-indeling, standen, wedstrijdschema en
knock-out bracket bekijken, live bijgewerkt terwijl jij als beheerder uitslagen invoert.

## Wat kan deze app?

- **Poulefase + knock-out**: teams spelen eerst 1x tegen elkaar in poules, daarna gaan de
  beste teams door naar een knock-out bracket (met automatische "byes" als het aantal
  gekwalificeerde teams geen macht van 2 is).
- **Alles instelbaar**: aantal poules, aantal doorstromers per poule, aantal kubb-banen,
  wedstrijdduur, starttijden en punten per overwinning stel je zelf in per toernooi.
- **Automatische schemagenerator**: poule-indeling en wedstrijdschema (tijd + baan) worden
  automatisch gegenereerd zodra je teams hebt toegevoegd, en zijn achteraf aan te passen.
- **Live publieke pagina**: poule-standen, volledig schema, "wie speelt nu op welke baan"
  en de knock-out bracket, real-time bijgewerkt via Firestore — geen inloggen nodig.
- **Eenvoudig beheer**: één beheerder logt in met een PIN-code en voegt teams toe, genereert
  het schema en voert na elke wedstrijd de uitslag in.
- **Meerdere toernooien**: de app is herbruikbaar; je kunt volgend jaar gewoon een nieuw
  toernooi aanmaken.

## Techniek

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- [Firebase Firestore](https://firebase.google.com/products/firestore) als database
  (real-time updates) en Firebase Authentication (anonieme login, zie beveiliging hieronder)
- Hosting op [Netlify](https://www.netlify.com)

---

## 1. Firebase-project opzetten

1. Ga naar de [Firebase console](https://console.firebase.google.com/) en klik op
   **Project toevoegen**. Geef het een naam, bv. `kubb-toernooi`. Google Analytics is niet
   nodig, je mag dit uitzetten.
2. Klik in het linkermenu op **Build → Firestore Database** en kies **Database maken**.
   - Kies een locatie in de buurt (bv. `eur3 (Europa)`).
   - Start in **testmodus** (we vervangen de regels hierna zelf met `firestore.rules`).
3. Klik in het linkermenu op **Build → Authentication → Sign-in method** en zet de provider
   **Anoniem (Anonymous)** aan. Dit wordt gebruikt om schrijftoegang te beveiligen (zie
   "Beveiliging" hieronder) — er komen geen echte gebruikersaccounts aan te pas.
4. Ga naar **Projectinstellingen** (tandwiel-icoon) → tabblad **Algemeen** → scroll naar
   **Jouw apps** → klik op het `</>` (web) icoon om een nieuwe webapp te registreren.
   Geef een naam (bv. "Kubb website") en klik op **App registreren**. Je krijgt nu een
   configuratieblok te zien met waarden zoals `apiKey`, `authDomain`, `projectId`, enz.
   Deze heb je nodig in stap 2.
5. (Optioneel maar aan te raden) Installeer de [Firebase CLI](https://firebase.google.com/docs/cli)
   en deploy de meegeleverde Firestore-regels, zodat alleen ingelogde (anonieme) sessies
   mogen schrijven:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add    # kies je project
   firebase deploy --only firestore:rules
   ```
   Doe je dit niet, dan blijft de database in "testmodus" open staan voor iedereen — dat
   werkt ook, maar is minder veilig.

## 2. Project lokaal instellen

1. Kopieer `.env.local.example` naar een nieuw bestand `.env.local` in de hoofdmap van dit
   project.
2. Vul de Firebase-configuratiewaarden in die je in stap 1.4 hebt gekregen:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
3. Kies zelf een PIN-code waarmee jij inlogt op het beheergedeelte en vul die in:
   ```
   NEXT_PUBLIC_ADMIN_PIN=jouw-pin-code
   ```
4. Installeer de dependencies en start de ontwikkelserver:
   ```bash
   npm install
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) voor de publieke pagina, en
   [http://localhost:3000/admin](http://localhost:3000/admin) voor het beheergedeelte
   (log in met de PIN die je in stap 3 hebt gekozen).

## 3. Een toernooi aanmaken en gebruiken

1. Ga naar `/admin`, maak een nieuw toernooi aan met een naam.
2. Open het toernooi en stel bij **Instellingen** het aantal poules, doorstromers per
   poule, aantal kubb-banen, wedstrijdduur, starttijden en punten per overwinning in.
3. Voeg bij **Teams** al je teams toe (naam + spelers).
4. Ga naar **Schema & uitslagen** en klik op **Poule-indeling & schema genereren**. Dit
   verdeelt de teams willekeurig over de poules en maakt automatisch het volledige
   wedstrijdschema (tijd + baan). Je kunt dit later opnieuw genereren (bv. als je nog
   een team toevoegt) — let op: dit overschrijft het bestaande schema.
5. Tijdens het toernooi vink je op deze pagina per wedstrijd de winnaar aan, vul je het
   aantal overgebleven kubbs in en geef je aan of het via de koningsstok was. De publieke
   pagina (`/t/<toernooi-id>`) werkt automatisch bij.
6. Zodra alle poulewedstrijden gespeeld zijn, ga je naar het tabblad **Knock-out** en klik
   je op **Knock-out fase genereren**. De beste teams per poule worden automatisch
   gerangschikt en in een bracket gezet (met byes voor de bestgeplaatste teams indien
   nodig). Voer de uitslagen hier op dezelfde manier in; de winnaar schuift automatisch
   door naar de volgende ronde.
7. Bezoekers kunnen het hele toernooi volgen via de link naar `/t/<toernooi-id>` (deel deze
   link of een QR-code die ernaartoe verwijst) — zonder in te loggen.

### Hoe de poulestand wordt berekend

Sortering: **punten** (3 per overwinning) → **onderling resultaat** (bij een gelijke stand
tussen precies twee teams) → **totaal aantal overgebleven kubbs**.

### Hoe de knock-out bracket wordt samengesteld

De teams die zich plaatsen (instelbaar aantal per poule) worden over alle poules heen
gerangschikt: eerst alle poule-winnaars op sterkte, dan alle nummers 2, enzovoort. Deze
volgorde wordt gebruikt voor een standaard toernooi-seeding (sterkste tegen zwakste). Als
het aantal gekwalificeerde teams geen macht van 2 is (bv. 6 of 10), krijgen de
bestgeplaatste teams automatisch een bye (vrije doorgang) in de eerste ronde(s).

---

## 4. Deployen op Netlify

1. Zet dit project in een Git-repository (GitHub/GitLab/Bitbucket) als dat nog niet zo is.
2. Ga naar [Netlify](https://app.netlify.com/) → **Add new site → Import an existing
   project** en koppel je repository. De meegeleverde `netlify.toml` zorgt automatisch
   voor de juiste build-instellingen (`npm run build` + het Next.js-plugin).
3. Voeg bij **Site settings → Environment variables** dezelfde variabelen toe als in je
   `.env.local` (de zes `NEXT_PUBLIC_FIREBASE_*` waarden + `NEXT_PUBLIC_ADMIN_PIN`).
   Dit moet **voor** de eerste deploy gebeuren, anders bevat de build geen geldige
   Firebase-configuratie.
4. Klik op **Deploy site**. Na een paar minuten krijg je een link (bv.
   `https://jouw-toernooi.netlify.app`) die je met alle bezoekers kunt delen — bijvoorbeeld
   via een QR-code op de zomerbar.
5. Ga in de Firebase console naar **Authentication → Settings → Authorized domains** en
   voeg je Netlify-domein toe (bv. `jouw-toernooi.netlify.app`), anders werkt het inloggen
   met de PIN-code niet vanaf de live site.

## Beveiliging: waarom een simpele PIN?

Op verzoek is gekozen voor een **eenvoudige PIN-code** in plaats van een volwaardig
account-systeem. Om schrijftoegang tot de database toch enigszins te beveiligen, logt de
app na een correcte PIN anoniem in via Firebase Authentication; de Firestore-regels
(`firestore.rules`) staan alleen schrijven toe aan "ingelogde" (ook anonieme) sessies.

Dit is **prima voor een vriendschappelijk buurttoernooi**, maar geen zware beveiliging: een
technisch onderlegd persoon zou in theorie de PIN-check kunnen omzeilen. Voor een groter of
gevoeliger toernooi kun je dit later uitbreiden naar echte Firebase-accounts
(e-mail/wachtwoord) door `signInAnonymously` in `src/lib/admin-auth.ts` te vervangen door
`signInWithEmailAndPassword`.

## Handige scripts

```bash
npm run dev             # ontwikkelserver starten
npm run build           # productie-build maken (ook gebruikt door Netlify)
npm run lint            # code controleren met ESLint
npm run test:scheduling # test de poule-/schema-/bracketlogica los van de UI
```

## Projectstructuur

```
src/
  app/
    page.tsx              Publieke homepage: lijst van toernooien
    t/[id]/page.tsx        Publieke toernooipagina (standen, schema, live, bracket)
    admin/layout.tsx       PIN-gate voor het beheergedeelte
    admin/page.tsx         Toernooien aanmaken/overzicht
    admin/[id]/page.tsx    Beheer van één toernooi (instellingen, teams, schema, uitslagen)
  components/              Herbruikbare UI-onderdelen (standen, schema, bracket, ...)
  lib/
    types.ts               Gedeelde TypeScript-types
    scheduling.ts           Poule-indeling, schemabouw, standenberekening, bracketlogica
    firestore-api.ts        Alle Firestore lees-/schrijffuncties
    firebase.ts             Firebase-initialisatie
    admin-auth.ts            PIN-login logica
scripts/test-scheduling.ts  Los testscript voor de kernlogica (zie npm run test:scheduling)
firestore.rules             Firestore security rules
netlify.toml                Netlify build-configuratie
```
