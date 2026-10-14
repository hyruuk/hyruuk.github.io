---
title: Brains vs. models in Super Mario
summary: Do artificial networks that play like us also think like us? Encoding models, imitation learning and generalization tests on brains playing Super Mario Bros.
start: 2022
end: ongoing
sections: [research]
keywords: [neuro-ai, videogames, neuroimaging]
featured: true
weight: 2
collaborators: [F. Paugam, A. Kemtur, M. St-Laurent, L. Bellec, R. Ponte Costa]
links:
  - { label: "Brittle Brain Encoding (CCN 2025)", url: "https://2025.ccneuro.org/abstract_pdf/Harel_2025_Brittle_Brain_Encoding_Poor_Out-of-Distribution_Generalization.pdf", kind: poster }
  - { label: "Brittle Brain Encoding — code", url: "https://doi.org/10.5281/zenodo.15642065", kind: code }
  - { label: "Behavioral imitation (Imaging Neuroscience)", url: "https://doi.org/10.1162/imag.a.1286", kind: paper }
  - { label: "MAIN 2025 session: videogames & RL for Neuro-AI", url: "https://main-educational.github.io/2025/neuroai-videogames/", kind: slides }
---

If an artificial network learns to play Super Mario Bros. the way a person does, does it also *represent* the game
the way that person's brain does? This line of work uses the CNeuroMod videogame datasets as a playground to compare
brains and machines.

- **Imitation leads to personal models.** Networks trained to imitate one specific player predict *that* player's
  brain activity better than anyone else's (Kemtur et al., *Imaging Neuroscience* 2026).
- **Brittle brain encoding.** Encoding models predict fMRI during play remarkably well on the levels they were trained
  on — and fail on unseen levels. Whatever they capture, the human brain is neither a NES nor a four-layer CNN
  (CCN 2025).
- **Region-aware models.** Current work builds models that respect brain regions and naturalistic behaviour (OHBM
  2026), developed in part during a research stay in Rui Ponte Costa's Neural & Machine Learning group at the
  University of Oxford in 2026.
