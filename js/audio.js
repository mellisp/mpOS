/* Audio System — Lazy-loads and plays UI sounds from audio/<name>.mp3 */

(function () {
  const cache = {};
  const defaultVolume = 0.1;

  function getVolume() {
    const saved = localStorage.getItem('mp-volume');
    return saved !== null ? parseFloat(saved) : defaultVolume;
  }

  function isMuted() {
    return localStorage.getItem('mp-muted') === '1';
  }

  function playSound(name) {
    if (isMuted()) return;

    if (!cache[name]) {
      cache[name] = new Audio('audio/' + name + '.mp3');
    }

    const sound = cache[name];
    sound.volume = getVolume();
    sound.currentTime = 0;
    sound.play().catch(function () { /* autoplay blocked — ignore */ });
  }

  function updateVolume() {
    const vol = getVolume();
    const muted = isMuted();
    for (const key in cache) {
      cache[key].volume = muted ? 0 : vol;
    }
  }

  window.mpAudio = { playSound: playSound };
  window.mpAudioUpdateVolume = updateVolume;
})();
