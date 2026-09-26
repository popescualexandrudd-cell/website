# ADR-0017: Monitorizare, erori și analytics auto-găzduite

- **Stare:** Propus (Etapa 0)
- **Data:** 2026-09-26
- **Legat de:** §4.3, §12.2 (analytics fără cookie-uri), §14

## Context
Sistemul trebuie supravegheat fără echipă de operațiuni: disponibilitate, erori, spațiu pe disc, starea fiecărui chioșc și ecran. Analytics-ul trebuie să respecte GDPR fără banner complex de cookie-uri.

## Decizie
1. **Uptime Kuma:** verificări de disponibilitate, pagina `status.<domeniu>` (opțională) și semnale de viață de la fiecare chioșc, ecran, worker Celery și job de backup.
2. **GlitchTip:** colector de erori auto-găzduit, compatibil cu bibliotecile Sentry (backend și frontend).
3. **Jurnale structurate** (JSON) cu ID de corelare între cereri, fără date personale inutile.
4. **Umami** pentru analytics fără cookie-uri (banner minim, §12.2).
5. Alertele ajung la personal pe email și notificări push (§11: dispozitiv offline, rest scăzut, backup eșuat, dispută nouă).
6. Metrici avansate (Prometheus + Grafana) doar dacă devin necesare.

## Alternative analizate
- **Plausible CE:** echivalent cu Umami; Umami e mai ușor și poate folosi PostgreSQL. Respins la egalitate.
- **Sentry auto-găzduit:** prea greu pentru un singur server. Respins.
- **Google Analytics:** cookie-uri, transfer de date către terți. Respins.

## Consecințe
- Câteva servicii suplimentare în Docker Compose, cu consum mic de resurse.
