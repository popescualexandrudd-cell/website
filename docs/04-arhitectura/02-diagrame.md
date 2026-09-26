# Diagrame de arhitectură

> Creat în Etapa 0 (26.09.2026). Diagramele sunt **ilustrative**: textul normativ rămâne în [01-arhitectura-sistemului.md](01-arhitectura-sistemului.md), în specificațiile din [aplicatii/](aplicatii/) și în [docs/03-liga/](../03-liga/). Diagramele se văd direct pe GitHub (format Mermaid).

## 1. Sistemul în ansamblu

Backend-ul central este singura sursă de adevăr (§4.1). Toate celelalte aplicații sunt „ferestre” spre aceleași date.

```mermaid
flowchart LR
    subgraph Internet
        C["Clienți<br/>(website + telefon, PWA)"]
        S["Personal<br/>(admin, 2FA)"]
    end

    subgraph Club["Rețeaua clubului"]
        KL["Chioșc Ligă<br/>+ Hardware Bridge<br/>(scanner)"]
        KP["Chioșc Plăți<br/>+ Hardware Bridge<br/>(scanner, numerar cu rest,<br/>casă de marcat, bonuri)"]
        SC["Ecrane teren<br/>+ lobby / cafenea / mezanin"]
        CD["Afișaj cafenea"]
    end

    subgraph Server["Serverul propriu (Docker Compose)"]
        PX["Caddy<br/>TLS + mTLS dispozitive"]
        WEB["web<br/>Next.js"]
        ADM["admin<br/>React"]
        API["backend<br/>Django + Ninja<br/>REST /api/v1"]
        WS["backend ASGI<br/>Channels (WebSockets)"]
        CEL["Celery worker + Beat"]
        DB[("PostgreSQL<br/>sursa de adevăr")]
        RD[("Redis<br/>cache, pub/sub, coadă")]
        ENG["league-engine<br/>(Python pur)"]
    end

    subgraph Adaptoare["Furnizori externi (prin adaptoare interschimbabile)"]
        EM["Email"]
        AI["Model AI<br/>(implicit Claude)"]
        WAL["Apple / Google Wallet"]
        PAY["Plăți online<br/>(dezactivat, Q9)"]
        SMS["SMS / WhatsApp<br/>(dezactivate)"]
        BK["Backup off-site<br/>(criptat)"]
    end

    C --> PX
    S --> PX
    KL -- "mTLS" --> PX
    KP -- "mTLS" --> PX
    SC -- "mTLS" --> PX
    CD -- "mTLS" --> PX
    PX --> WEB
    PX --> ADM
    PX --> API
    PX --> WS
    WEB --> API
    API --> DB
    API --> RD
    API --> ENG
    CEL --> DB
    CEL --> RD
    CEL --> ENG
    WS --> RD
    CEL --> EM
    CEL --> WAL
    API --> AI
    API -.-> PAY
    CEL -.-> SMS
    DB -.-> BK
```

## 2. Fluxul unui meci oficial de ligă (§6.9)

Starea se schimbă doar pe server. Fiecare tranziție verifică independent: rezervarea, scanările la intrarea pe teren, plata (registrul contabil) și dispozitivul (doar Chioșcul Ligă înregistrat).

```mermaid
stateDiagram-v2
    [*] --> PROGRAMAT: rezervare de tip meci oficial / provocare / turneu
    PROGRAMAT --> IN_DESFASURARE: începe intervalul rezervat
    IN_DESFASURARE --> FEREASTRA_SCOR_DESCHISA: ora de final a rezervării (la turneu, meciul marcat terminat)
    FEREASTRA_SCOR_DESCHISA --> SCOR_PROPUS: un jucător scanează cardul și introduce scorul
    SCOR_PROPUS --> CONFIRMAT_DE_TOTI: toți ceilalți scanează și confirmă
    SCOR_PROPUS --> DISPUTAT: un jucător contestă
    FEREASTRA_SCOR_DESCHISA --> EXPIRAT: fereastra de 30 de minute se închide fără scor
    SCOR_PROPUS --> EXPIRAT: fereastra se închide fără toate confirmările
    CONFIRMAT_DE_TOTI --> VALIDAT: rezervarea e plătită integral
    CONFIRMAT_DE_TOTI --> ASTEAPTA_PLATA: rest de plată
    ASTEAPTA_PLATA --> VALIDAT: plata completată la chioșc
    ASTEAPTA_PLATA --> EXPIRAT: termenul de plată (implicit 24 h, Q11)
    VALIDAT --> APLICAT: MMR, LP, ranguri, ecrane, Wallet, notificări
    CONFIRMAT_DE_TOTI --> CONVERTIT_ANTRENAMENT: 0 seturi complete (§6.8)
    PROGRAMAT --> ANULAT: rezervare anulată
    APLICAT --> [*]
    DISPUTAT --> [*]: soluționare în admin (detaliată în Etapa 6)
    EXPIRAT --> [*]
    ANULAT --> [*]
    CONVERTIT_ANTRENAMENT --> [*]
```

## 3. Plata împărțită a unei ore, cu numerar (§8.3, R-060, R-061)

Serverul creditează numerarul doar pe baza evenimentelor semnate de Hardware Bridge; comenzile de rest sunt semnate de server (ADR-0013).

```mermaid
sequenceDiagram
    autonumber
    actor J as Jucător
    participant K as Chioșc Plăți (browser)
    participant B as Hardware Bridge (local)
    participant N as Aparat numerar
    participant S as Backend
    participant F as Casă de marcat

    J->>B: scanează cardul (QR)
    B-->>K: card scanat (mesaj semnat)
    K->>S: „Împarte ora” pentru rezervarea R
    S-->>K: părțile calculate (R-061), cât mai e de plătit
    K->>S: verifică restul disponibil înainte de plată
    S-->>K: rest suficient (altfel avertisment ÎNAINTE de introducerea banilor)
    J->>N: introduce bancnote
    N->>B: bancnotă acceptată
    B->>B: scrie evenimentul în jurnalul local (pe disc)
    B->>S: eveniment de numerar semnat Ed25519
    S->>S: înregistrare în registru (idempotent)
    S-->>K: parte plătită, rest de dat
    S->>B: comandă de rest semnată de server
    B->>N: dă restul
    B->>F: bon fiscal
    S-->>K: plata confirmată, actualizare live „cât mai e de plătit”
```
