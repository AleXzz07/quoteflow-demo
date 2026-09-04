# QuoteFlow

Demo commerciale di un'applicazione web per la gestione dei preventivi di piccole officine meccaniche e carpenterie metalliche.

L'app funziona interamente nel browser e salva i dati in `localStorage`: non richiede backend, database o variabili d'ambiente.

## Impostare il contatto della CTA

Prima della pubblicazione, aprire `components/quote-flow-app.tsx` e sostituire il valore di `CONTACT_EMAIL` con il proprio indirizzo email. Il valore incluso nel progetto usa il dominio riservato `example.com` ed è soltanto un placeholder.

## 1. Installare le dipendenze

Requisiti: Node.js 20.19 o successivo e npm.

```bash
npm install
```

## 2. Avviare il progetto in locale

```bash
npm run dev
```

Aprire nel browser l'indirizzo mostrato nel terminale, normalmente `http://localhost:5173`.

## 3. Creare una build di produzione

```bash
npm run build
```

La build viene generata nella cartella `dist`. Per provarla localmente:

```bash
npm run preview
```

## 4. Caricare il progetto su GitHub

1. Creare un nuovo repository vuoto su GitHub, per esempio `quoteflow-demo`.
2. Aprire il terminale nella cartella del progetto.
3. Eseguire:

```bash
git init
git add .
git commit -m "Initial QuoteFlow demo"
git branch -M main
git remote add origin https://github.com/IL-TUO-USERNAME/quoteflow-demo.git
git push -u origin main
```

Sostituire `IL-TUO-USERNAME` con il proprio nome utente GitHub.

## 5. Collegare il repository a Vercel

1. Accedere a [Vercel](https://vercel.com/).
2. Selezionare **Add New → Project**.
3. Importare il repository GitHub di QuoteFlow.
4. Vercel riconoscerà automaticamente Vite.
5. Verificare queste impostazioni:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Premere **Deploy**.

Non servono variabili d'ambiente.

## Comandi disponibili

```bash
npm run dev       # server di sviluppo
npm run build     # controllo TypeScript e build produzione
npm run preview   # anteprima della build
npm run typecheck # solo controllo TypeScript
```
