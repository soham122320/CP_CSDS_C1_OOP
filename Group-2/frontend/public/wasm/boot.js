// Loaded as a native browser module so Vite does not transform the generated loader.
import createRescueEngine from './game.js';
window.createRescueEngine = createRescueEngine;
