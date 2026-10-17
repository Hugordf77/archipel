# Archive « Île d'étude »

Code de la version « jeu de révision », retiré du jeu au passage à « Archipel » (LOT 0).
Rien ici n'est importé ni livré dans le bundle ; c'est une simple copie de sécurité
(le projet n'est pas sous git).

- game/Pomodoro.js — minuteur de sessions (focus / pause)
- game/flashcards.js — fiches et répétition espacée SM-2
- game/stats.js — heures, séries
- game/tasks.js — tâches du jour en bouteilles
- game/plants.js — plantes liées aux matières
- game/knowledge/ — moteur de quiz inachevé (domaines, barème, Elo)
- ui/studyPanels.js — bibliothèque des fiches, tâches, journal des heures
- ui/focusPanels.js — préparation de session, minuteur, carte de récompense
- tests/knowledge.test.js — tests du moteur de quiz

Les données d'étude des sauvegardes existantes sont conservées intactes dans `state.legacy`.
