/* Audio System — Bits & Bobs
   Lazy-loads and plays UI sounds from audio/<name>.mp3 */

(function () {
  var cache = {};
  var defaultVolume = 0.1;

  function getVolume() {
    var saved = localStorage.getItem('bb-volume');
    return saved !== null ? parseFloat(saved) : defaultVolume;
  }

  function isMuted() {
    return localStorage.getItem('bb-muted') === '1';
  }

  function playSound(name) {
    if (isMuted()) return;

    if (!cache[name]) {
      cache[name] = new Audio('audio/' + name + '.mp3');
    }

    var sound = cache[name];
    sound.volume = getVolume();
    sound.currentTime = 0;
    sound.play().catch(function () { /* autoplay blocked — ignore */ });
  }

  function updateVolume() {
    var vol = getVolume();
    var muted = isMuted();
    for (var key in cache) {
      cache[key].volume = muted ? 0 : vol;
    }
  }

  window.bbAudio = { playSound: playSound };
  window.bbAudioUpdateVolume = updateVolume;
})();
