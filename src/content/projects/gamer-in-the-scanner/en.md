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
