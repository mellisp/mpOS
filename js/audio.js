/* Audio System — Lazy-loads and plays UI sounds from audio/<name>.mp3 */

(function () {
  'use strict';

  const cache = {};
  const DEFAULT_VOLUME = 0.1;

  const getVolume = () => {
    const saved = localStorage.getItem('mp-volume');
    return saved !== null ? parseFloat(saved) : DEFAULT_VOLUME;
  };

  const isMuted = () => localStorage.getItem('mp-muted') === '1';

  const playSound = (name) => {
    if (isMuted()) return;

    /* Delegate to Sound Producer for procedural synthesis when available */
    if (window.mpSoundProducer) {
      window.mpSoundProducer.play(name);
      return;
    }

    /* Fallback: load MP3 from audio/ directory */
    if (!cache[name]) {
      cache[name] = new Audio(`audio/${name}.mp3`);
    }

    const sound = cache[name];
    sound.volume = getVolume();
    sound.currentTime = 0;
    sound.play().catch(() => { /* autoplay blocked — ignore */ });
  };

  const updateVolume = () => {
    const vol = getVolume();
    const muted = isMuted();
    for (const key in cache) {
      cache[key].volume = muted ? 0 : vol;
    }
  };

  window.mpAudio = { playSound };
  window.mpAudioUpdateVolume = updateVolume;
})();
