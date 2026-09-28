import { BOARD_SPACES, LANDMARKS } from './fusion-data.js';
import { DetroitRenderer, useBoardData } from './renderer.js?v=42';
import { FusionEngine } from './fusion-engine.js';
import { FusionUI } from './fusion-ui.js';

useBoardData(BOARD_SPACES,LANDMARKS);
const engine=new FusionEngine();
const renderer=new DetroitRenderer(document.getElementById('game3d'));
renderer.setPlayers(engine.state.players);
renderer.boardView();
const ui=new FusionUI(engine,renderer);
window.musicCityFusion={engine,renderer,ui};

