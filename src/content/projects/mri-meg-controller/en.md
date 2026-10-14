---
title: A videogame controller for MRI and MEG
summary: An open-hardware, 3D-printed gamepad that works inside MRI and MEG scanners without adding noise or head motion — so people can play real games while we image their brains.
start: 2019
end: 2023
sections: [research, code]
keywords: [videogames, neuroimaging]
weight: 2
role: Co-first author — validation, testing, documentation
links:
  - { label: "Paper (PLOS ONE)", url: "https://doi.org/10.1371/journal.pone.0290158", kind: paper }
  - { label: "Build documentation", url: "https://controller-doc.readthedocs.io", kind: docs }
  - { label: "Hardware files (Zenodo)", url: "https://doi.org/10.5281/zenodo.7847544", kind: data }
  - { label: "Validation code (Zenodo)", url: "https://doi.org/10.5281/zenodo.7847577", kind: code }
cover: ./cover.jpg
coverAlt: A player sits under the MEG helmet, playing Shinobi on the projection screen with the pink 3D-printed controller
coverCredit: Playing Shinobi in the MEG with the controller (CNeuroMod)
figures:
  - src: ./overview.png
    style: wide
    alt:
      en: "Summary figure: the 3D-printed controller and its parts, the comparison with a commercial controller, a replica built elsewhere, and photos in MEG and MRI"
      fr: "Figure de synthèse : la manette imprimée en 3D et ses pièces, la comparaison avec une manette du commerce, une réplique fabriquée ailleurs, et des photos en MEG et en IRM"
    caption:
      en: "At a glance: open build files and software, an evaluation against a commercial controller (no significant difference in reaction times), a replication from the online documentation, and use in MEG and MRI."
      fr: "En un coup d'œil : plans et logiciels ouverts, une évaluation face à une manette du commerce (pas de différence significative des temps de réaction), une réplication à partir de la documentation en ligne, et l'usage en MEG et en IRM."
    credit: Harel (2024), PhD thesis, Université de Montréal
  - src: ./model.jpg
    alt:
      en: 3D model of the gamepad with a cross-shaped pad and four coloured buttons
      fr: Modèle 3D de la manette avec une croix directionnelle et quatre boutons de couleur
    caption:
      en: The 3D model, from the controller's open documentation.
      fr: Le modèle 3D, tiré de la documentation ouverte de la manette.
    credit: controller-doc.readthedocs.io
  - src: ./parts.jpg
    style: plate
    alt:
      en: 3D models and photos of the controller's printed parts, button mechanism, circuit board and assembled gamepad
      fr: Modèles 3D et photos des pièces imprimées, du mécanisme des boutons, du circuit imprimé et de la manette assemblée
    caption:
      en: The controller's parts, as 3D models (A–D) and as built (E–H).
      fr: Les pièces de la manette, en modèles 3D (A–D) et une fois fabriquées (E–H).
    credit: "Harel, Cyr et al. (2023), PLOS ONE, Fig. 1 — CC BY 4.0"
  - src: ./reproduction.jpg
    alt:
      en: Photos of a copy of the controller built by another lab, from circuit board to finished gamepad
      fr: Photos d'une copie de la manette fabriquée par un autre laboratoire, du circuit imprimé à la manette terminée
    caption:
      en: "Rebuilt elsewhere from the open plans, by a team at Inria / NeuroSpin: circuit board (A), button mechanism (B), optical fibres (C) and the finished controller (D)."
      fr: "Refabriquée ailleurs à partir des plans ouverts, par une équipe d'Inria / NeuroSpin : circuit imprimé (A), mécanisme des boutons (B), fibres optiques (C) et manette terminée (D)."
    credit: "Harel, Cyr et al. (2023), PLOS ONE, Fig. 9 — CC BY 4.0"
---

Standard gamepads are full of metal and electronics: they are not allowed in the MRI room and they ruin MEG
recordings. To let people play naturally in both scanners, we designed a controller from scratch — a 3D-printed
shell, a familiar layout, and fibre-optic buttons that carry no electrical signal into the shielded room.

We then checked that it works for science: players reach normal performance with it, it adds no measurable head
motion in fMRI and no artefacts in MEG, and its latency is low enough for fast-paced games. Every file needed to build
one is open, and the design has already been rebuilt by other labs.

Published in *PLOS ONE* (2023), co-first authorship with A. Cyr.
