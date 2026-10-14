---
title: CNeuroMod Mario
summary: Un vaste jeu de données IRMf longitudinal de personnes qui apprennent et jouent à Super Mario Bros. — avec rejeux, oculométrie, physiologie et annotations des scènes du jeu.
coverAlt: "Une partie de Super Mario Bros. — Mario écrase des ennemis dans le premier niveau"
---

Super Mario Bros. est l'un des jeux les plus étudiés en intelligence artificielle — et l'un des plus joués au monde.
Dans le projet [Courtois NeuroMod](https://www.cneuromod.ca), quelques volontaires y ont joué dans le scanner IRM,
séance après séance, pendant que nous enregistrions leur activité cérébrale, leurs yeux, leur cœur, leur respiration
et chaque pression de bouton.

Résultat : environ 84 heures d'IRMf de personnes qui *apprennent* un jeu pendant des mois — comment elles
progressent, quelles parties d'un niveau leur résistent, et comment leur cerveau réagit à ce qui se passe à l'écran.

J'ai conçu l'expérience et les outils qui l'entourent, et rendu les données prêtes à l'analyse :

- **Des rejeux aux variables.** Chaque partie est enregistrée et peut être resimulée image par image : l'état interne
  du jeu (position, ennemis, bonus, morts…) devient une série temporelle alignée sur les données cérébrales.
- **Des scènes.** Les niveaux sont découpés en 313 courtes scènes annotées selon leurs motifs de level design, pour
  étudier l'apprentissage scène par scène.
- **Des tutoriels.** Des carnets qui présentent les GLM, les cartes cérébrales, les agents d'apprentissage par
  renforcement et les modèles d'encodage sur ces données.

Ce jeu de données est la colonne vertébrale de mon travail en Neuro-IA, qui compare cerveaux et agents artificiels.
L'article de données est en préparation.
