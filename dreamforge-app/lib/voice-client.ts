'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  return recognition;
}

export async function playAudioFromBase64(base64: string): Promise<void> {
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Audio playback failed'));
    audio.play();
  });
}

export async function playAudioFromUrl(url: string): Promise<void> {
  const audio = new Audio(url);
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Audio playback failed'));
    audio.play();
  });
}
