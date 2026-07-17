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

## 1. Firebase-project opzetten (stap voor stap, met voorbeeld)

We nemen als doorlopend voorbeeld een fictief toernooi: **"Hernieuwersweekend — Zaterdag
Kubbspel"**. Overal waar hieronder een naam of waarde staat, vervang je die gewoon door je
eigen toernooi. Firebase is gratis voor dit gebruik (klein aantal bezoekers/schrijfacties).

### 1.1 Firebase-project aanmaken

1. Ga naar de [Firebase console](https://console.firebase.google.com/) (log in met een
   Google-account, bv. je eigen Gmail).
2. Klik op **Project toevoegen** (het grote plus-vakje).
3. Vul als projectnaam bijvoorbeeld `hernieuwersweekend-kubb` in en klik op **Doorgaan**.
   > Let op: dit is enkel de *technische naam* van je Firebase-project. De naam die
   > bezoekers zien ("Hernieuwersweekend — Zaterdag Kubbspel") vul je straks gewoon in de
   > app zelf in bij het aanmaken van een toernooi op `/admin` — die twee namen hoeven niet
   > overeen te komen.
4. Bij "Google Analytics voor dit project" mag je de schakelaar gerust **uitzetten** — dat
   heb je niet nodig. Klik op **Project maken** en wacht tot het klaar is.

### 1.2 Database aanmaken (Firestore)

1. Klik in het linkermenu op **Build → Firestore Database**.
2. Klik op **Database maken**.
3. Kies een locatie dicht bij jou, bv. `eur3 (europe-west)`. Klik op **Volgende**.
4. Kies **Starten in testmodus** en klik op **Database maken**.
   > "Testmodus" betekent dat de database tijdelijk open staat. Dat is prima om meteen te
   > kunnen testen; in stap 1.4 hieronder maken we dit veiliger met het bestand
   > `firestore.rules` dat al in dit project zit.

### 1.3 Anonieme login aanzetten (voor de PIN-beveiliging van /admin)

1. Klik in het linkermenu op **Build → Authentication**.
2. Klik op **Aan de slag** (indien dit de eerste keer is).
3. Ga naar het tabblad **Sign-in method** (of "Aanmeldmethode").
4. Klik in de lijst op **Anoniem**, zet de schakelaar **Inschakelen** aan, klik **Opslaan**.
   > Dit heeft niets te maken met echte gebruikersaccounts of e-mailadressen van je teams —
   > het wordt alleen intern gebruikt zodat de app weet dat jij (na het invoeren van de
   > juiste PIN) schrijfrechten hebt. Zie "Beveiliging" verderop in dit document.

### 1.4 Webapp registreren en configuratiewaarden ophalen

Dit is de stap die de meeste verwarring geeft — hier haal je de "sleutel" op waarmee de
website met jouw database mag praten.

1. Klik linksboven op het **tandwiel-icoon** naast "Projectoverzicht" → **Projectinstellingen**.
2. Blijf op tabblad **Algemeen** en scroll naar beneden tot **Jouw apps**.
3. Klik op het icoon **`</>`** (dit betekent "web app toevoegen").
4. Geef als bijnaam bijvoorbeeld `Kubb website` in en klik op **App registreren**.
   Je hoeft "Firebase Hosting" hier **niet** aan te vinken (we hosten via Netlify).
5. Firebase toont nu een codeblok dat er ongeveer zo uitziet:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSyD-abcdefghijklmnopqrstuvwxyz1234",
     authDomain: "hernieuwersweekend-kubb.firebaseapp.com",
     projectId: "hernieuwersweekend-kubb",
     storageBucket: "hernieuwersweekend-kubb.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:aabbccddeeff00112233",
   };
   ```
   Dit zijn precies de zes waarden die je in stap 2 hieronder in `.env.local` moet plakken.
   Klik daarna op **Doorgaan naar console** — je hebt de rest niet nodig.

### 1.5 (Optioneel maar aan te raden) Beveiligingsregels installeren

Zonder deze stap blijft je database in "testmodus" (open voor iedereen om te lezen én te
schrijven) totdat die na 30 dagen automatisch afsluit. Met deze stap zorg je dat alleen
mensen die via `/admin` met de juiste PIN inloggen mogen schrijven, en dat iedereen (zoals
gewild) wel altijd mag lezen.

```bash
npm install -g firebase-tools
firebase login
firebase use --add
# Kies in de lijst je project, bv. "hernieuwersweekend-kubb", en geef het een alias "default"
firebase deploy --only firestore:rules
```

## 2. Project lokaal instellen

1. Kopieer het bestand `.env.local.example` en hernoem de kopie naar `.env.local`
   (in dezelfde map, de hoofdmap van dit project).
2. Open `.env.local` en plak de zes waarden uit stap 1.4 hierboven. Voor ons voorbeeld
   zou dat er zo uitzien (jouw waarden zijn uiteraard anders):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD-abcdefghijklmnopqrstuvwxyz1234
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hernieuwersweekend-kubb.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=hernieuwersweekend-kubb
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hernieuwersweekend-kubb.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:aabbccddeeff00112233
   ```
3. Kies zelf een PIN-code (bv. een 4-cijferig getal dat jij makkelijk onthoudt) waarmee jij
   straks inlogt op het beheergedeelte, en voeg die als **zevende** regel toe:
   ```
   NEXT_PUBLIC_ADMIN_PIN=4711
   ```
   > `.env.local` staat al in `.gitignore`, dus dit bestand met jouw geheime waarden wordt
   > nooit meegecommit naar Git — dat is met opzet zo.
4. Installeer de dependencies en start de ontwikkelserver:
   ```bash
   npm install
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) — dit is de publieke pagina die
   bezoekers straks zien. Open [http://localhost:3000/admin](http://localhost:3000/admin)
   voor het beheergedeelte en log in met de PIN uit stap 3 (in ons voorbeeld: `4711`).

## 3. Een toernooi aanmaken en gebruiken (voorbeeld: Hernieuwersweekend)

1. Ga naar `/admin`, log in met je PIN, en maak een nieuw toernooi aan met de naam
   **"Hernieuwersweekend — Zaterdag Kubbspel"**.
2. Open het toernooi en stel bij **Instellingen** bijvoorbeeld in: 4 poules, top 2 per
   poule gaat door, 3 kubb-banen, 25 minuten per wedstrijd, starttijd zaterdag 14:00.
3. Voeg bij **Teams** al je teams toe (naam + spelers), bv. "De Wildekes" met spelers
   Jef en Mieke.
4. Ga naar **Schema & uitslagen** en klik op **Poule-indeling & schema genereren**. Dit
   verdeelt de teams willekeurig over de 4 poules en maakt automatisch het volledige
   wedstrijdschema (tijd + baan) vanaf zaterdag 14:00. Je kunt dit later opnieuw genereren
   (bv. als je nog een team toevoegt) — let op: dit overschrijft het bestaande schema.
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

## 4. Deployen op Netlify (voorbeeld)

1. Zet dit project in een Git-repository (GitHub/GitLab/Bitbucket) als dat nog niet zo is.
2. Ga naar [Netlify](https://app.netlify.com/) → **Add new site → Import an existing
   project** en koppel je repository. De meegeleverde `netlify.toml` zorgt automatisch
   voor de juiste build-instellingen (`npm run build` + het Next.js-plugin).
3. Voeg bij **Site settings → Environment variables** dezelfde 7 variabelen toe als in je
   `.env.local` (de zes `NEXT_PUBLIC_FIREBASE_*` waarden + `NEXT_PUBLIC_ADMIN_PIN`, in ons
   voorbeeld dus ook `NEXT_PUBLIC_ADMIN_PIN=4711`). Dit moet **voor** de eerste deploy
   gebeuren, anders bevat de build geen geldige Firebase-configuratie.
4. Klik op **Deploy site**. Na een paar minuten krijg je een link, bijvoorbeeld
   `https://hernieuwersweekend-kubb.netlify.app`, die je met alle bezoekers kunt delen —
   bijvoorbeeld via een QR-code op de zomerbar die naar
   `https://hernieuwersweekend-kubb.netlify.app/t/<toernooi-id>` verwijst.
5. Ga in de Firebase console naar **Authentication → Settings → Authorized domains** en
   voeg je Netlify-domein toe (in ons voorbeeld `hernieuwersweekend-kubb.netlify.app`),
   anders werkt het inloggen met de PIN-code niet vanaf de live site.

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
