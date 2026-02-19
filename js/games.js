/* Games — Chicken Fingers, Aquarium, On Target, Brick Breaker, Fractal Explorer */
(function () {
'use strict';

/* ── State ── */
let aquariumPlayer = null;
let aquariumTimer = null;

/* ── Chicken Fingers ── */
const openChickenFingers = () => {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    openWindow('chickenError');
    return false;
  }
  return true;
};

/* ── Virtual Aquarium (YouTube IFrame Player API) ── */
const openAquarium = async () => {
  const embed = document.getElementById('aquariumEmbed');
  const shield = document.getElementById('aquariumShield');
  openWindow('aquarium');
  if (!embed.dataset.loaded) {
    shield.classList.remove('loaded');
    embed.dataset.loaded = '1';
    await loadYouTubeAPI();
    const playerDiv = document.createElement('div');
    playerDiv.id = 'ytAquariumPlayer';
    embed.appendChild(playerDiv);
    aquariumPlayer = new YT.Player('ytAquariumPlayer', {
      videoId: 'DHUnz4dyb54',
      playerVars: {
        autoplay: 1, mute: 1, controls: 0, rel: 0,
        iv_load_policy: 3, modestbranding: 1,
        disablekb: 1, fs: 0
      },
      events: {
        onReady: () => {
          aquariumTimer = setTimeout(() => shield.classList.add('loaded'), 5000);
        }
      }
    });
  }
};

const closeAquarium = () => {
  const embed = document.getElementById('aquariumEmbed');
  const shield = document.getElementById('aquariumShield');
  if (aquariumPlayer && aquariumPlayer.destroy) {
    aquariumPlayer.destroy();
    aquariumPlayer = null;
  }
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  clearTimeout(aquariumTimer);
  shield.classList.remove('loaded');
  embed.dataset.loaded = '';
  mpTaskbar.closeWindow('aquarium');
};

/* ── On Target (embedded game) ── */
const openOnTarget = () => {
  const embed = document.getElementById('ontargetEmbed');
  openWindow('ontarget');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    const iframe = document.createElement('iframe');
    iframe.src = 'target-game.html';
    iframe.title = 'On Target';
    let initialLoad = true;
    iframe.addEventListener('load', () => {
      if (initialLoad) { initialLoad = false; return; }
      closeOnTarget();
    });
    embed.appendChild(iframe);
  }
};

const closeOnTarget = () => {
  const embed = document.getElementById('ontargetEmbed');
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  mpTaskbar.closeWindow('ontarget');
};

/* ── Brick Breaker (embedded game) ── */
const openBrickBreaker = () => {
  const embed = document.getElementById('brickbreakerEmbed');
  openWindow('brickbreaker');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    const iframe = document.createElement('iframe');
    iframe.src = 'brick-breaker.html';
    iframe.title = 'Brick Breaker';
    let initialLoad = true;
    iframe.addEventListener('load', () => {
      if (initialLoad) { initialLoad = false; return; }
      closeBrickBreaker();
    });
    embed.appendChild(iframe);
  }
};

const closeBrickBreaker = () => {
  const embed = document.getElementById('brickbreakerEmbed');
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  mpTaskbar.closeWindow('brickbreaker');
};

/* ── Fractal Explorer (embedded app) ── */
const openFractal = () => {
  const embed = document.getElementById('fractalEmbed');
  openWindow('fractal');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    const iframe = document.createElement('iframe');
    iframe.src = 'fractal.html';
    iframe.title = 'Fractal Explorer';
    embed.appendChild(iframe);
  }
};

const closeFractal = () => {
  const embed = document.getElementById('fractalEmbed');
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  mpTaskbar.closeWindow('fractal');
};

/* ── Register with core ── */
window.mpRegisterActions({
  openOnTarget,
  openChickenFingers,
  openBrickBreaker,
  openFractal,
  openAquarium
});

window.mpRegisterWindows({
  ontarget: 'On Target',
  brickbreaker: 'Brick Breaker',
  fractal: 'Fractal Explorer',
  aquarium: 'Virtual Aquarium',
  chickenError: 'Chicken Fingers'
});

window.mpRegisterCloseHandlers({
  aquarium: closeAquarium,
  ontarget: closeOnTarget,
  brickbreaker: closeBrickBreaker,
  fractal: closeFractal
});

/* ── Export HTML onclick handlers ── */
window.openChickenFingers = openChickenFingers;
window.openAquarium = openAquarium;
window.closeAquarium = closeAquarium;
window.openOnTarget = openOnTarget;
window.closeOnTarget = closeOnTarget;
window.openBrickBreaker = openBrickBreaker;
window.closeBrickBreaker = closeBrickBreaker;
window.openFractal = openFractal;
window.closeFractal = closeFractal;

})();
