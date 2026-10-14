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
cover: ./cover.png
coverAlt: Twelve small brains coloured from blue to yellow, showing how well three models predict brain activity during play
coverCredit: Encoding maps from Harel, Paugam et al. (CCN 2025)
figures:
  - src: ./generalization.png
    style: wide
    alt:
      en: Brain maps of prediction accuracy for three models on familiar and unseen levels, with bar charts per participant
      fr: Cartes cérébrales de la précision de prédiction de trois modèles sur des niveaux connus et inconnus, avec des diagrammes en barres par participant
    caption:
      en: Encoding models predict brain activity well on the levels they were trained on (A) and much less on unseen levels (B, C).
      fr: Les modèles d'encodage prédisent bien l'activité cérébrale sur les niveaux d'entraînement (A), beaucoup moins sur des niveaux inconnus (B, C).
    credit: Harel, Paugam, St-Laurent & Bellec, CCN 2025
  - src: ./encoding.png
    style: plate
    alt:
      en: "Diagram: game frames and console memory feed three models whose features predict the player's brain signal by ridge regression"
      fr: "Schéma : les images du jeu et la mémoire de la console alimentent trois modèles dont les variables prédisent le signal cérébral du joueur par régression ridge"
    caption:
      en: Three ways of describing the game (a trained agent's network, an untrained network, the console's memory) are used to predict brain activity, trained on 20 levels and tested on 2 unseen ones.
      fr: Trois façons de décrire le jeu (le réseau d'un agent entraîné, un réseau non entraîné, la mémoire de la console) servent à prédire l'activité cérébrale, entraînées sur 20 niveaux et testées sur 2 niveaux inconnus.
    credit: Harel, Paugam, St-Laurent & Bellec, CCN 2025
  - src: ./imitation-maps.jpg
    style: plate
    alt:
      en: Brain maps of four participants showing where an imitation network predicts their brain activity
      fr: Cartes cérébrales de quatre participants montrant où un réseau d'imitation prédit leur activité cérébrale
    caption:
      en: Where a network trained to imitate each player predicts that player's brain activity, and which of its layers matter.
      fr: Là où un réseau entraîné à imiter chaque joueur prédit l'activité cérébrale de ce joueur, et quelles couches comptent.
    credit: "Kemtur et al. (2026), Imaging Neuroscience, Fig. 5 — CC BY 4.0"
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
