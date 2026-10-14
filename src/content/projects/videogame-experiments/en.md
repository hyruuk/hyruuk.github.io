---
title: Videogame experiment engines
summary: Open-source tools to run deterministic videogame experiments with fMRI, MEG, EEG and intracranial recordings — from Super Mario to grid-world games.
start: 2025
end: ongoing
sections: [code, research]
keywords: [videogames, neuro-ai, neuroimaging]
links:
  - { label: "mario_task", url: "https://github.com/hyruuk/mario_task", kind: code }
  - { label: "dbp_tasks", url: "https://github.com/hyruuk/dbp_tasks", kind: code }
  - { label: "vgdl_task", url: "https://github.com/hyruuk/vgdl_task", kind: code }
  - { label: "fmri-gym", url: "https://github.com/tomov/fmri-gym", kind: code }
  - { label: "Controller validation task", url: "https://github.com/hyruuk/controller_validation_task", kind: code }
---

Running a game inside a scanner is mostly an engineering problem: the game must be deterministic and replayable,
every frame must be timestamped against the scanner, and the outputs must follow neuroimaging standards (BIDS) so
that anyone can analyse them.

- **mario_task** — a reproducible Super Mario Bros. experiment runner with EEG/iEEG markers and BIDS output.
- **dbp_tasks** — a prototype engine for deterministic videogame experiments across behaviour, fMRI, MEG and iEEG.
- **vgdl_task** — a VGDL game runner reproducing the Tomov et al. (2023) scanner task, plus contributions to
  **fmri-gym**, which turns Gymnasium environments into fMRI experiments.
- **controller_validation_task** — a PsychoPy task to validate game controllers in fMRI, MEG and EEG.
