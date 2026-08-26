/* ------------------------------------------------------------------
   Two languages, one set of pages. The choice is remembered per
   browser and falls back to the visitor's own locale, so an Italian
   phone lands on Italian without touching anything.

   Product names and descriptions live in the database, not here —
   see nameOf()/blurbOf() in shop.js for those.
   ------------------------------------------------------------------ */

const KEY = "shop.lang";

export const LANGS = { en: "EN", it: "IT" };

export function currentLang() {
  const saved = localStorage.getItem(KEY);
  if (saved && LANGS[saved]) return saved;
  return (navigator.language || "en").toLowerCase().startsWith("it") ? "it" : "en";
}

export function setLang(lang) {
  if (!LANGS[lang]) return;
  localStorage.setItem(KEY, lang);
  location.reload();
}

const STRINGS = {
  en: {
    /* chrome */
    bag: "Bag", account: "Account", credit: "Credit", signOut: "Sign out",
    backOffice: "Back office", smallRuns: "Made in small runs",

    /* hero */
    heroTag: "One serial per shirt · numbered once · never reissued",
    heroH1a: "Earn by", heroH1b: "wearing it.",
    heroLede: "Every shirt carries a number that exists exactly once. Claim yours and the garment is on the record as yours — where it came from, who has worn it. Then it starts paying you back: every stranger who scans your back in the street and buys sends fifty cents to your balance.",
    tagNumbered: "Numbered", tagTraceable: "Traceable",
    tagCollectible: "Collectible", tagScanBack: "Scan the back",

    /* ticker */
    ticker: ["Earn by wearing", "One serial, one shirt", "Traceable origin",
             "€0.50 every scan", "Never reissued", "Collectible", "Store credit, not cashback"],

    /* how it works */
    howTitle: "How it works",
    how1t: "Buy it",   how1p: "Pick a colour and a size. Each shirt leaves here with a number nobody else has.",
    how2t: "Claim it", how2p: "Scan the code on the back before you wear it. The number locks to your account, permanently.",
    how3t: "Wear it",  how3p: "The code sits between your shoulders. Anyone can scan it from across a room.",
    how4t: "Earn it",  how4p: "Every scan that ends in a sale puts fifty cents in your balance. Spend it on the next one.",

    /* catalogue */
    searchPh: "Search by name, tag or code",
    add: "Add", added: "Added", pickOne: "Pick one", soldOut: "Sold out",
    oneSize: "One size", left: "left",
    nothingYet: "Nothing in stock yet.",
    nothingYetP: "Check back shortly.",
    loadFail: "Could not load the shop. Please try again in a moment.",
    matches: "match", matchesPl: "matches", nothingFound: "Nothing found",
    forQuery: "for", clear: "Clear",
    noMatch: "No item matches that. Try a different word, or clear the search to see everything.",

    /* cart */
    yourBag: "Your bag", bagEmpty: "Nothing here yet. Add something from the rails.",
    discountPh: "Discount code", apply: "Apply", remove: "Remove",
    useCredit: "Use", creditWord: "credit",
    subtotal: "Subtotal", toPay: "To pay", checkout: "Checkout",
    opening: "Opening checkout…", emailPrompt: "Email for your receipt:",
    size: "size",

    /* auth */
    signIn: "Sign in", signUp: "Create an account",
    welcomeBack: "Welcome back", startBalance: "Start a balance",
    name: "Name", email: "Email", password: "Password",
    createAccount: "Create account", haveOne: "I already have one", needOne: "I need an account",
    needBoth: "Enter an email and a password.",
    signedInAs: "Signed in as", balance: "Balance",
    garmentsClaimed: "Garments claimed", referredSales: "Referred sales", yourSerials: "Your serials",

    /* scan page */
    garment: "Garment", reading: "Reading the code…",
    linkBroken: "This link is missing its code. Check the QR and scan again.",
    unreachable: "Could not reach the shop. Check your connection and scan again.",
    noSuchCode: "No garment carries this code.",
    mineTitleA: "This one", mineTitleB: "is mine",
    mineNote: "Claim this number and every future scan of this shirt earns you credit.",
    claimCta: "Claim →",
    wantTitleA: "I want", wantTitleB: "one too",
    wantNote: "Buy the same piece. Fifty cents goes to whoever is wearing the one you scanned.",
    shopCta: "Shop →",
    serial: "Serial", signInClaim: "Sign in to claim", createClaim: "Create your account",
    claimLede: "The serial locks to this account permanently. Credit from it lands here.",
    createAndClaim: "Create account and claim", signInAndClaim: "Sign in and claim",
    confirmInbox: "Check your inbox to confirm the address, then scan again to finish claiming.",
    claimFailed: "The claim did not go through. Scan again in a moment.",
    alreadyOthers: "This serial already belongs to another account.",
    cannotClaim: "This code cannot be claimed.",
    claimed: "Claimed", isYours: "is yours.",
    claimedLede: "Wear it. Every time someone scans this shirt and buys, {amount} is added to your balance. Spend it on anything in the shop.",
    browseShop: "Browse the shop", seeEverything: "See everything else",
    addToBag: "Add to bag", outOfCatalogue: "This piece is out of the catalogue.",
    lookInstead: "Have a look at what is in stock instead.",
    registeredToYou: "This serial is registered to you.",
    goesToOwner: "{amount} of this sale goes to the owner of this shirt.",

    /* success */
    order: "Order", thankYou: "Thank you.",
    orderIn: "Your order is in. A receipt is on its way to your inbox.",
    paid: "Paid", creditUsed: "Credit used", balanceLeft: "Balance left",
    backToShop: "Back to the shop", reference: "Reference",
  },

  it: {
    bag: "Carrello", account: "Account", credit: "Credito", signOut: "Esci",
    backOffice: "Gestione", smallRuns: "Prodotto in piccole serie",

    heroTag: "Un numero per maglia · numerata una volta · mai ristampata",
    heroH1a: "Guadagna", heroH1b: "indossandola.",
    heroLede: "Ogni maglia porta un numero che esiste una volta sola. Rivendica il tuo e il capo risulta tuo — da dove viene, chi lo ha indossato. Da lì comincia a ripagarti: ogni sconosciuto che inquadra la tua schiena per strada e compra ti manda cinquanta centesimi sul saldo.",
    tagNumbered: "Numerata", tagTraceable: "Tracciabile",
    tagCollectible: "Da collezione", tagScanBack: "Inquadra la schiena",

    ticker: ["Guadagna indossandola", "Un numero, una maglia", "Origine tracciabile",
             "€0,50 a scansione", "Mai ristampata", "Da collezione", "Credito, non contanti"],

    howTitle: "Come funziona",
    how1t: "Compra", how1p: "Scegli colore e taglia. Ogni maglia esce da qui con un numero che nessun altro ha.",
    how2t: "Rivendica", how2p: "Inquadra il codice sulla schiena prima di indossarla. Il numero si lega al tuo account, per sempre.",
    how3t: "Indossa", how3p: "Il codice sta tra le scapole. Chiunque può inquadrarlo anche da lontano.",
    how4t: "Guadagna", how4p: "Ogni scansione che si trasforma in vendita ti mette cinquanta centesimi sul saldo. Spendili sulla prossima.",

    searchPh: "Cerca per nome, tag o codice",
    add: "Aggiungi", added: "Aggiunta", pickOne: "Scegli", soldOut: "Esaurita",
    oneSize: "Taglia unica", left: "rimaste",
    nothingYet: "Ancora nulla in magazzino.",
    nothingYetP: "Torna a trovarci a breve.",
    loadFail: "Non riesco a caricare il negozio. Riprova tra poco.",
    matches: "risultato", matchesPl: "risultati", nothingFound: "Nessun risultato",
    forQuery: "per", clear: "Cancella",
    noMatch: "Nessun articolo corrisponde. Prova un'altra parola, o cancella la ricerca per vedere tutto.",

    yourBag: "Il tuo carrello", bagEmpty: "Ancora vuoto. Aggiungi qualcosa dalle file qui accanto.",
    discountPh: "Codice sconto", apply: "Applica", remove: "Togli",
    useCredit: "Usa", creditWord: "di credito",
    subtotal: "Totale parziale", toPay: "Da pagare", checkout: "Vai al pagamento",
    opening: "Apro il pagamento…", emailPrompt: "Email per la ricevuta:",
    size: "taglia",

    signIn: "Accedi", signUp: "Crea un account",
    welcomeBack: "Bentornato", startBalance: "Apri un saldo",
    name: "Nome", email: "Email", password: "Password",
    createAccount: "Crea account", haveOne: "Ho già un account", needOne: "Mi serve un account",
    needBoth: "Inserisci email e password.",
    signedInAs: "Accesso come", balance: "Saldo",
    garmentsClaimed: "Capi rivendicati", referredSales: "Vendite generate", yourSerials: "I tuoi numeri",

    garment: "Capo", reading: "Leggo il codice…",
    linkBroken: "A questo link manca il codice. Controlla il QR e riprova.",
    unreachable: "Non riesco a raggiungere il negozio. Controlla la connessione e riprova.",
    noSuchCode: "Nessun capo porta questo codice.",
    mineTitleA: "Questa", mineTitleB: "è mia",
    mineNote: "Rivendica questo numero: ogni scansione futura di questa maglia ti farà guadagnare credito.",
    claimCta: "Rivendica →",
    wantTitleA: "La voglio", wantTitleB: "anch'io",
    wantNote: "Compra lo stesso capo. Cinquanta centesimi vanno a chi indossa quella che hai inquadrato.",
    shopCta: "Negozio →",
    serial: "Numero", signInClaim: "Accedi per rivendicare", createClaim: "Crea il tuo account",
    claimLede: "Il numero si lega a questo account per sempre. Il credito che genera arriva qui.",
    createAndClaim: "Crea account e rivendica", signInAndClaim: "Accedi e rivendica",
    confirmInbox: "Conferma l'indirizzo dalla tua casella, poi inquadra di nuovo per completare.",
    claimFailed: "La rivendicazione non è andata a buon fine. Riprova tra poco.",
    alreadyOthers: "Questo numero appartiene già a un altro account.",
    cannotClaim: "Questo codice non può essere rivendicato.",
    claimed: "Rivendicata", isYours: "è tua.",
    claimedLede: "Indossala. Ogni volta che qualcuno inquadra questa maglia e compra, {amount} finisce sul tuo saldo. Spendili su qualsiasi cosa nel negozio.",
    browseShop: "Vai al negozio", seeEverything: "Vedi tutto il resto",
    addToBag: "Aggiungi al carrello", outOfCatalogue: "Questo capo non è più in catalogo.",
    lookInstead: "Dai un'occhiata a cosa c'è disponibile.",
    registeredToYou: "Questo numero è registrato a te.",
    goesToOwner: "{amount} di questa vendita vanno a chi possiede questa maglia.",

    order: "Ordine", thankYou: "Grazie.",
    orderIn: "Il tuo ordine è registrato. La ricevuta sta arrivando via email.",
    paid: "Pagato", creditUsed: "Credito usato", balanceLeft: "Saldo residuo",
    backToShop: "Torna al negozio", reference: "Riferimento",
  },
};

export const LANG = currentLang();

/* t("key") or t("key", { amount: "€0.50" }) */
export function t(key, vars) {
  let out = STRINGS[LANG]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars && typeof out === "string")
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}
