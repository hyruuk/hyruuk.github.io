---
title: MariHA — human-AI alignment in Super Mario
summary: A continual reinforcement-learning benchmark where AI agents learn Super Mario Bros. scenes in the same order as human players — to compare learning trajectories, not just final scores.
start: 2025
end: ongoing
sections: [research, code]
keywords: [neuro-ai, videogames]
links:
  - { label: "Workshop paper (OpenReview)", url: "https://openreview.net/forum?id=YAVB439L9X", kind: paper }
  - { label: "Benchmark code", url: "https://github.com/courtois-neuromod/MariHA", kind: code }
  - { label: "Agent evaluation", url: "https://github.com/hyruuk/mario_eval", kind: code }
cover: ./cover.png
coverAlt: Part of a triangular similarity matrix, with blue blocks along the diagonal grouping similar scenes
coverCredit: Detail of the scene-similarity matrix from Harel, Bellec et al. (RLC 2025 workshop)
figures:
  - src: ./learning.png
    style: plate
    alt:
      en: Line and bar charts comparing scene-by-scene success rates of human players and a PPO agent across learning stages
      fr: Courbes et diagrammes en barres comparant, scène par scène, les taux de réussite de joueurs humains et d'un agent PPO au fil de l'apprentissage
    caption:
      en: "Human vs AI learning trajectories: scene-level success across learning stages on level 3-1, for people (A) and a PPO agent (B), then by level-design pattern (C, D)."
      fr: "Trajectoires d'apprentissage humaines et artificielles : réussite par scène au fil de l'apprentissage du niveau 3-1, chez les humains (A) et un agent PPO (B), puis par motif de level design (C, D)."
    credit: Harel, Bellec et al., RLC 2025 workshop
---

Most game-playing AI is judged on its final score. People, though, learn in a particular order, forget, transfer
skills between levels, and get stuck in very human places. MariHA turns the scene-by-scene learning histories of the
CNeuroMod Mario players into a continual-learning benchmark: agents face the same scenes in the same order, and we can
ask whether their learning curves look like ours.

Presented at the Reinforcement Learning and Video Games workshop of RLC 2025, co-first authorship with Lune Bellec.
