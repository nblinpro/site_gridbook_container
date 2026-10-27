# Mastère 2 Social Média, Marketing d'influence & Événementiel : guide de réalisation

**2 places** · un profil stratégie et contenus (missions 1 et 2), un profil acquisition, mesure
et événementiel (missions 3, 4 et 5).

Objectif : faire connaître GridBook et faire vivre sa communauté au rythme des week-ends de
course, dans un cadre juridique propre.

---

## Le produit en bref

- Jeu de **pronostics** sur la Formule 1, le MotoGP et la NASCAR, avec les données officielles.
- Monnaie **virtuelle** (APEX) : 10 000 offerts à l'inscription, **aucune valeur monétaire**,
  jamais achetable ni convertible en argent.
- Pronostics sur le vainqueur de chaque course et sur les champions de fin de saison, cotes en
  pari mutuel (elles dépendent des mises de tous les joueurs).
- Boutique cosmétique : avatars, cadres, badges, titres, couleurs de pseudo, collections
  éphémères (ex. « Nuit de Las Vegas »), éditions numérotées, récompenses à gagner.
- Classements des joueurs, et bientôt profil public, ligues privées entre amis, discussion
  pendant les courses (voir `docs/ameliorations.md`).
- Slogan existant : **« Prends position avant le départ »**.

Pour le découvrir : se créer un compte sur l'environnement de démonstration, placer quelques
pronostics, visiter la boutique. Lire `docs/ameliorations.md` pour la suite du produit.

---

## Cadre à respecter dans toute la communication

| Sujet | Règle |
|---|---|
| **Jeu sans argent réel** | Toujours le dire. Ne jamais employer « gagner de l'argent », « cash », « bookmaker », « mise réelle ». Préférer « pronostic » à « pari » dans les accroches. Un jeu d'argent en ligne exige un agrément de l'ANJ ; GridBook n'en est pas un et ne doit pas en avoir l'air. |
| **Marques déposées** | « Formule 1 », « F1 », « MotoGP », « NASCAR », les noms d'écuries et de pilotes sont des marques. Les citer pour décrire ce dont on parle, mais **aucun logo**, aucune image officielle, aucune formulation qui laisse croire à un partenariat. Mention type : « GridBook n'est affilié à aucun championnat, écurie ou pilote. » |
| **Images** | Utiliser uniquement des visuels créés par l'équipe ou sous licence libre ; pas de photos de course trouvées en ligne. |
| **Influence** | Loi du 9 juin 2023 : tout contenu sponsorisé porte la mention « Publicité » ou « Collaboration commerciale », visible. Contrats écrits avec les créateurs. |
| **Données personnelles** | RGPD : pas de cookies de mesure sans consentement (voir mission 4). |
| **Jeunes publics** | Les mécaniques ressemblent à du pari : pas de ciblage des mineurs dans les campagnes payantes. |

---

## Mission 1 : stratégie et positionnement

1. **Étude de marché**
   - Concurrents directs : jeux « fantasy » officiels (F1 Fantasy, MotoGP Fantasy, NASCAR
     Fantasy), applications de pronostics entre amis, communautés Discord de fans.
   - Pour chacun : promesse, public, fonctionnalités, présence sociale, ce que GridBook fait de
     différent (trois championnats en un compte, cotes vivantes, boutique et récompenses,
     ligues à venir).
   - Taille du public : audiences françaises de la F1, du MotoGP et de la NASCAR, communautés
     existantes (Reddit, Discord, Twitch).
2. **Personas** : deux ou trois profils précis (ex. le fan de F1 de 18-30 ans qui joue entre
   amis, le passionné de moto, le curieux de NASCAR), avec motivations, freins, canaux.
3. **Proposition de valeur** et **plateforme de marque** : mission, ton (expert, enthousiaste,
   jamais « parieur »), vocabulaire autorisé et interdit, exemples de messages.
4. **Charte éditoriale** : formats par réseau, règles de ton, hashtags, réponse aux commentaires.
   Visuels construits sur la charte du site (`docs/design-system.md`) avec le M1 UX-UI.
5. **Business plan** : GridBook ne vend ni APEX ni avantages de jeu. Pistes de financement à
   étudier : partenariats et sponsors **hors jeux d'argent** (équipementiers, simulateurs,
   médias, circuits de karting), événements, contenus. Hypothèses chiffrées, coûts
   (hébergement, outils, publicité), jalons.

**Livrables** : étude de marché, personas, plateforme de marque, charte éditoriale, business plan.

---

## Mission 2 : communauté et réseaux sociaux

1. **Comptes** : X, Instagram, TikTok, puis Discord. Biographie qui dit clairement « jeu de
   pronostics sans argent réel ».
2. **Calendrier éditorial calé sur les courses** (calendriers disponibles dans le site) :

| Moment | Contenu type |
|---|---|
| J-3 | présentation de la course, du circuit, ouverture des pronostics |
| Qualifications | grille de départ, « qui est favori pour la communauté ? » |
| Jour de course | rappel avant la clôture, réactions en direct |
| Lendemain | résultats, meilleur pronostic de la communauté, classement des joueurs |
| Chaque semaine | récapitulatif, nouveautés de la boutique, collection éphémère |

3. **Discord communautaire** : salons par championnat, #annonces, #pronostics, #boutique,
   #entraide ; rôles par championnat suivi ; règles affichées ; modérateurs désignés.
4. **Charte de modération** commune au Discord et à la future discussion par course du site
   (avec le M2 Full Stack) : contenus interdits, sanctions graduées, procédure de signalement,
   délai de traitement.
5. **Campagnes boutique** : lancement de chaque collection éphémère avec compte à rebours,
   mise en avant des éditions numérotées.

**Livrables** : comptes ouverts et animés, calendrier éditorial de la saison, serveur Discord,
charte de modération.

---

## Mission 3 : inbound et prospection

1. **Référencement : un prérequis technique.** Aujourd'hui tout le site est derrière la
   connexion : Google ne voit que la page de connexion. Rédiger avec le M2 Full Stack le cahier
   des charges de **pages publiques** : page d'accueil de présentation, calendriers, palmarès,
   fiches circuits, avec titres et descriptions travaillés.
2. **Articles de blog** optimisés (mots-clés choisis avec un outil de recherche de mots-clés) :
   guide d'une saison, présentation des circuits, « comment pronostiquer un Grand Prix »,
   palmarès historiques (données disponibles depuis 1950 pour la F1).
3. **Stratégie d'acquisition** : canaux, budget, objectifs (inscriptions, joueurs actifs).
4. **Prospection** : écoles et associations étudiantes (ligues inter-écoles), clubs de karting,
   médias et créateurs du sport automobile, partenaires possibles du business plan. Fichier de
   suivi des contacts, conforme au RGPD (données professionnelles, droit d'opposition).
5. **Influence** : micro-créateurs du sport automobile, opérations « ligue de la communauté »,
   toujours avec la mention de collaboration commerciale.

**Livrables** : cahier des charges des pages publiques, 10 articles publiés, plan d'acquisition,
fichier de prospection et premiers partenariats.

---

## Mission 4 : mesure de la performance

1. **Outil de mesure respectueux du RGPD** : le site n'a pas de bandeau de consentement.
   Deux options à présenter à l'équipe :
   - un outil sans cookie et exempté de consentement (Matomo configuré selon la CNIL,
     Plausible) : le plus simple ;
   - Google Analytics **avec** un bandeau de consentement (réalisé par le M2 Full Stack).
   Search Console dans tous les cas.
2. **Plan de marquage** (avec le M2 Full Stack) : inscription, premier pronostic, pronostic sur
   chaque championnat, achat en boutique, récompense obtenue, retour après 1, 7 et 30 jours.
3. **Tableaux de bord** : acquisition par canal, conversion visite → inscription → premier
   pronostic, rétention, engagement sur les réseaux.
4. **Bilan après chaque Grand Prix** : inscriptions, pronostics placés, achats en boutique,
   meilleurs contenus ; trois actions pour la course suivante.

**Livrables** : outil installé et conforme, plan de marquage, tableau de bord hebdomadaire,
bilans de course.

---

## Mission 5 : événementiel

1. **Stand de recrutement et de présentation** (Ydays) : démonstration du site, page des
   missions, supports imprimés aux couleurs de la charte.
2. **Soirées de visionnage** (watch parties) d'un Grand Prix : pronostics en direct, classement
   de la soirée, récompenses cosmétiques dédiées (avec l'équipe boutique).
3. **Compétition inter-écoles** sur une saison, avec les ligues privées dès qu'elles existent.
4. Pour chaque événement : objectifs, budget, logistique, communication avant et après, bilan.

---

## Planning

| Sprint | Travail |
|---|---|
| 1 | étude de marché, personas, plateforme de marque, choix de l'outil de mesure |
| 2 | charte éditoriale, ouverture des comptes et du Discord, calendrier éditorial |
| 3 | cahier des charges des pages publiques, premiers articles, plan de marquage |
| 4 | campagnes boutique, prospection, première soirée de visionnage |
| Ensuite | influence, compétition inter-écoles, business plan consolidé |

## Collaboration

| Avec | Pour |
|---|---|
| M1 UX-UI | visuels des réseaux, gabarits aux couleurs de la charte |
| M2 Full Stack | pages publiques, bandeau de consentement, plan de marquage, discussion par course |
| Équipe boutique (M1 UX-UI, B1 Informatique) | calendrier des collections et des récompenses |
| M2 Data Engineer | chiffres d'audience du jeu (inscriptions, pronostics, économie) |
