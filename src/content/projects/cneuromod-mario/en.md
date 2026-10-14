---
title: CNeuroMod Mario
summary: A large longitudinal fMRI dataset of people learning and playing Super Mario Bros. — with replays, eye-tracking, physiology and scene-level annotations of the game.
start: 2024
end: ongoing
sections: [research, code]
keywords: [videogames, neuroimaging, neuro-ai]
featured: true
weight: 3
role: Design, data collection, curation and analysis of the Super Mario Bros. dataset
collaborators: [Lune Bellec, Basile Pinsard, Julie A. Boyle, the Courtois NeuroMod team]
links:
  - { label: "Dataset documentation", url: "https://docs.cneuromod.ca/datasets/mario.html", kind: docs }
  - { label: "Dataset repository", url: "https://github.com/courtois-neuromod/mario", kind: data }
  - { label: "Scene annotations (Zenodo)", url: "https://doi.org/10.5281/zenodo.19223182", kind: data }
  - { label: "Tutorials", url: "https://github.com/courtois-neuromod/mario.tutorials", kind: code }
  - { label: "Replay toolbox", url: "https://github.com/courtois-neuromod/mario.replays", kind: code }
cover: ./cover.png
coverAlt: Super Mario Bros. gameplay — Mario stomping enemies in the first level
coverVideo: /media/cneuromod-mario/stomp.mp4
coverCredit: A participant's play, re-rendered from the dataset's replays (mario.scenes, CC0)
figures:
  - src: ./trajectories.png
    alt:
      en: Forty paths of one player through the same scene, drawn over the level, green jump arcs and red falls
      fr: Quarante trajectoires d'un même joueur dans la même scène, tracées sur le niveau, sauts en vert et chutes en rouge
    caption:
      en: "Forty attempts by one player at the same scene, re-simulated from the replays: in green the jumps, in red the falls."
      fr: "Quarante tentatives d'un même joueur sur la même scène, resimulées à partir des replays : en vert les sauts, en rouge les chutes."
    credit: mario.learning_trajectories (CNeuroMod)
  - src: ./scenes.png
    style: wide
    alt:
      en: Level 3-1 cut into thirteen scenes, a table of the game patterns in each scene, and similarity matrices between scenes
      fr: Le niveau 3-1 découpé en treize scènes, un tableau des motifs de jeu de chaque scène et des matrices de similarité entre scènes
    caption:
      en: Scene annotations. Level 3-1 split into short scenes (A), the level-design patterns found in each (B), and how similar scenes are within the level (C) and across all 313 scenes (D, E).
      fr: Annotation des scènes. Le niveau 3-1 découpé en courtes scènes (A), les motifs de level design présents dans chacune (B), et la similarité des scènes dans le niveau (C) et parmi les 313 scènes (D, E).
    credit: Harel, Bellec et al., RLC 2025 workshop
  - src: ./overview.jpg
    style: plate
    alt:
      en: Charts of runs per participant, repetitions per level, game events, button presses and performance across practice
      fr: Graphiques des sessions par participant, des répétitions par niveau, des événements de jeu, des appuis sur les boutons et de la performance au fil de la pratique
    caption:
      en: "The dataset at a glance: runs per participant (A, B), repetitions of each level (C), game events and button presses (D, E), and how performance improves with practice (F–H)."
      fr: "Le jeu de données en un coup d'œil : sessions par participant (A, B), répétitions de chaque niveau (C), événements de jeu et appuis sur les boutons (D, E), et progression de la performance avec la pratique (F–H)."
    credit: CNeuroMod Mario dataset paper (in preparation)
  - src: ./brain-maps.jpg
    style: plate
    alt:
      en: Brain maps of defeating an enemy and getting hit for five participants, with reliability bars and confusion matrices
      fr: Cartes cérébrales pour l'élimination d'un ennemi et la perte de vie chez cinq participants, avec des barres de fiabilité et des matrices de confusion
    caption:
      en: Brain activity when Mario defeats an enemy (Kill) or gets hit (Hit) in each participant (A), how reliable such maps are (B), and how well a classifier tells game events apart from brain activity alone (C).
      fr: L'activité cérébrale quand Mario élimine un ennemi (Kill) ou se fait toucher (Hit), pour chaque participant (A), la fiabilité de ces cartes (B), et la capacité d'un classifieur à distinguer les événements de jeu à partir de la seule activité cérébrale (C).
    credit: CNeuroMod Mario dataset paper (in preparation)
---

Super Mario Bros. is one of the most studied games in AI research — and one almost everybody has played. In the
[Courtois NeuroMod](https://www.cneuromod.ca) project, a handful of volunteers played it inside the MRI scanner,
session after session, while we recorded their brain activity, their eyes, their heart and breathing, and every
single button press.

The result is roughly 84 hours of fMRI of people *learning* a game over months: how they get better, which parts
of a level challenge them, and how their brains respond to what happens on screen.

My part was to design the experiment and the tools around it, and to make the data analysis-ready:

- **Replays → variables.** Every run is saved as a replay that can be re-simulated frame by frame, so the game's
  internal state (position, enemies, power-ups, deaths…) becomes a time series aligned with the brain data.
- **Scenes.** The levels are split into 313 short scenes annotated with their level-design patterns, so that
  learning can be studied scene by scene.
- **Tutorials.** Notebooks that walk through GLMs, brain maps, reinforcement-learning agents and encoding models
  on this data.

The dataset is the backbone of my Neuro-AI work comparing brains with artificial agents. The data paper is in
preparation.
