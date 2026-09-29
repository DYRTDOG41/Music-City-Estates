import { BOARD_SPACES, LANDMARKS } from './fusion-data.js?v=4';
import { DetroitRenderer, useBoardData } from './renderer.js?v=43';
import { FusionEngine } from './fusion-engine.js?v=5';
import { FusionUI } from './fusion-ui.js?v=6';

useBoardData(BOARD_SPACES,LANDMARKS);
const engine=new FusionEngine();
const renderer=new DetroitRenderer(document.getElementById('game3d'));
renderer.setPlayers(engine.state.players);
renderer.boardView();
const ui=new FusionUI(engine,renderer);
window.musicCityFusion={engine,renderer,ui};
