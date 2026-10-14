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
