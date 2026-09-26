# ADR-0020: Design tokens — identitate vizuală interschimbabilă dintr-un singur loc

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §2.4, §12.4, §15.4

## Context
Logo-ul, culorile și fonturile nu sunt încă stabilite (se decid în următoarele ~6 luni). Totul trebuie construit astfel încât schimbarea identității să se facă dintr-un singur loc.

## Decizie
1. `packages/design-tokens`: tokeni în format standard DTCG (JSON): culori, tipografie, spațieri, raze, umbre, durate și curbe de animație.
2. **Style Dictionary** generează din ei: variabile CSS, constante TypeScript și tema Tailwind (ADR-0007).
3. Aplicațiile folosesc **doar tokeni**; o regulă de lint interzice culorile și fonturile scrise direct în cod.
4. **Temă provizorie originală „jungle”** (de exemplu verde-jungle profund, negru nocturn, accent luminos „neon”, nisip cald), **diferită de site-ul Clubului Tenis Elite**; variante de temă pentru ecrane (contrast mare, lizibil de la distanță) și chioșcuri (butoane mari).
5. **Fonturi open-source găzduite local** (fără încărcare de la terți la rulare).
6. Contrastul culorilor se verifică automat față de WCAG 2.2 AA.

## Alternative analizate
- **Culori definite separat în fiecare aplicație:** schimbarea identității ar cere modificări în zeci de fișiere. Respins.

## Consecințe
- Când proprietarul alege logo-ul și culorile finale, se schimbă tokenii și toate aplicațiile se actualizează.
