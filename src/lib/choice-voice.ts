import { useEffect } from "react";

let audio: HTMLAudioElement | null = null;
let clip: HTMLAudioElement | null = null;
let busy = false;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio("/audio/choice.mp3?v=prev");
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.volume = 0.9;
    audio.addEventListener("ended", () => {
      busy = false;
    });
    audio.addEventListener("error", () => {
      busy = false;
    });
  }
  return audio;
}

export function primeChoiceVoice() {
  getAudio()?.load();
}

export function playChoiceVoice() {
  const a = getAudio();
  if (!a) return;
  if (busy && !a.paused && a.currentTime > 0.05) return;

  busy = true;
  stopOrderClip();
  try {
    a.currentTime = 0;
  } catch {
    /* ignore */
  }

  const start = a.play();
  if (start) {
    void start.catch(() => {
      busy = false;
    });
  }

  window.setTimeout(() => {
    busy = false;
  }, 4000);
}

export function playOrderClip(src: string, onEnded?: () => void) {
  if (typeof window === "undefined") return;
  audio?.pause();
  busy = false;
  if (clip) {
    clip.pause();
    clip.src = "";
  }
  clip = new Audio(src);
  clip.setAttribute("playsinline", "true");
  clip.volume = 0.88;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnded?.();
  };

  clip.addEventListener("ended", finish);
  clip.addEventListener("error", finish);
  void clip.play().catch(() => finish());
}

export function stopOrderClip() {
  if (!clip) return;
  clip.pause();
  clip.currentTime = 0;
}

export function VoicePrime() {
  useEffect(() => {
    const warm = () => {
      primeChoiceVoice();
      window.removeEventListener("pointerdown", warm);
    };
    window.addEventListener("pointerdown", warm, { passive: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, []);
  return null;
}
