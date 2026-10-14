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
---

Most game-playing AI is judged on its final score. People, though, learn in a particular order, forget, transfer
skills between levels, and get stuck in very human places. MariHA turns the scene-by-scene learning histories of the
CNeuroMod Mario players into a continual-learning benchmark: agents face the same scenes in the same order, and we can
ask whether their learning curves look like ours.

Presented at the Reinforcement Learning and Video Games workshop of RLC 2025, co-first authorship with Lune Bellec.
