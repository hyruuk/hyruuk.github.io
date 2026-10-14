---
title: Gamer in the scanner
summary: Brains scanned while playing Shinobi III. The game's own memory labels every event — kills, hits, jumps — so brain maps of videogame play can be computed automatically and reliably.
start: 2020
end: 2026
sections: [research, code]
keywords: [videogames, neuroimaging]
featured: true
weight: 3
role: First author — experiment, analysis pipeline, paper
collaborators: [Lune Bellec, Karim Jerbi, Basile Pinsard, Julie Boyle, the Courtois NeuroMod team]
links:
  - { label: "Paper (Imaging Neuroscience, open access)", url: "https://doi.org/10.1162/IMAG.a.1256", kind: paper }
  - { label: "Preprint", url: "https://osf.io/preprints/psyarxiv/uakq9_v5", kind: preprint }
  - { label: "Analysis code", url: "https://github.com/courtois-neuromod/shinobi_fmri", kind: code }
  - { label: "Shinobi dataset", url: "https://docs.cneuromod.ca/datasets/shinobi.html", kind: data }
cover: ./cover.png
coverAlt: Shinobi III gameplay — the ninja fights his way through a forest as enemies explode
coverVideo: /media/gamer-in-the-scanner/shinobi.mp4
coverCredit: A participant's play, re-rendered from the dataset's replays (CNeuroMod Shinobi)
figures:
  - src: ./kill-maps.jpg
    style: plate
    alt:
      en: Brain maps for Kill events in four participants and their sessions, and their overlap with sound and reward maps
      fr: Cartes cérébrales des événements « Kill » chez quatre participants et pour leurs sessions, et leur recouvrement avec les cartes du son et de la récompense
    caption:
      en: "Brain activity when the player defeats an enemy: maps for each participant and their sessions (A), compared with the game's sound level (B) and with reward (C)."
      fr: "L'activité cérébrale quand le joueur élimine un ennemi : cartes pour chaque participant et ses sessions (A), comparées au volume sonore du jeu (B) et à la récompense (C)."
    credit: "Harel et al. (2026), Imaging Neuroscience, Fig. 6 — CC BY 4.0"
  - src: ./pipeline.png
    style: plate
    alt:
      en: Analysis pipeline from BOLD, anatomical MRI and game replays through preprocessing and GLMs to brain maps, correlations and classifiers
      fr: Chaîne d'analyse, de l'IRMf, de l'IRM anatomique et des replays du jeu au prétraitement et aux GLM, jusqu'aux cartes cérébrales, corrélations et classifieurs
    caption:
      en: From brain scans and game replays to brain maps, and how their quality is assessed.
      fr: Des images cérébrales et des replays du jeu aux cartes cérébrales, et l'évaluation de leur qualité.
    credit: "Harel et al. (2026), Imaging Neuroscience, Fig. 3 — CC BY 4.0"
---

Videogames are rich, fast and interactive — exactly what classic brain-imaging experiments are not. The catch is
that a game produces thousands of events, and nobody can label them by hand.

In this study, four participants played the 16-bit side-scroller *Shinobi III: Return of the Ninja Master* in the
scanner, for about 31 hours in total. Instead of hand-coding what happened, we read the game's memory while
replaying each session: every enemy defeated, every hit taken, every jump becomes an event with a precise timestamp.

These automated annotations are enough to run classic event-related fMRI analyses on naturalistic play, and the
resulting brain maps are reliable from one session to the next and specific to each kind of action. It is a step
towards treating videogames as real experimental paradigms — controlled enough for science, engaging enough for
real life.

Published open access in *Imaging Neuroscience* (2026).
