import './setup.js';
import '../ui/style.css';
import { Game } from './Game.js';

// Archipel — point d'entrée
const game = new Game(document.getElementById('app'));
game.init().catch((err) => {
  console.error(err);
  const ui = document.getElementById('ui');
  ui.innerHTML = `<div class="paper" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:24px 28px;max-width:440px">
    <b>Oups, l'archipel n'a pas pu se charger.</b><br><span class="muted">${String(err && err.message ? err.message : err)}</span></div>`;
});
