'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSpeechRecognition, playAudioFromBase64 } from '@/lib/voice-client';
import { MOMENTS_COSTS } from '@/lib/moments-config';

interface VoiceCallModalProps {
  characterId: string;
  characterName: string;
  characterAvatarUrl?: string;
  onClose: () => void;
}

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
}

export default function VoiceCallModal({
  characterId,
  characterName,
  characterAvatarUrl,
  onClose,
}: VoiceCallModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'ending' | 'ended'>('connecting');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('sb-access-token');
    if (raw) return raw;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          return parsed?.access_token || null;
        } catch {
          continue;
        }
      }
    }
    return null;
  };

  const authHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Start the call session
  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/voice/session', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ characterId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to start call');
        }

        const data = await res.json();
        setSessionId(data.sessionId);
        sessionIdRef.current = data.sessionId;
        setCallStatus('active');

        // Start the timer
        timerRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setCallStatus('ended');
      }
    };

    startSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [characterId, authHeaders]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send text to API and play response
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSpeaking) return;

    setTranscript((prev) => [...prev, { role: 'user', content: text.trim() }]);
    setIsSpeaking(true);

    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          text: text.trim(),
          characterId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const data = await res.json();
      setTranscript((prev) => [...prev, { role: 'assistant', content: data.text }]);

      // Play audio if available
      if (data.audioBase64) {
        try {
          await playAudioFromBase64(data.audioBase64);
        } catch (audioErr) {
          console.error('Audio playback failed:', audioErr);
        }
      }
    } catch (err) {
      console.error('Voice speak error:', err);
      setTranscript((prev) => [
        ...prev,
        { role: 'assistant', content: '(Sorry, I had trouble responding. Try again.)' },
      ]);
    } finally {
      setIsSpeaking(false);
    }
  }, [isSpeaking, characterId, authHeaders]);

  // Push-to-talk handlers
  const startListening = useCallback(() => {
    if (isListening || isSpeaking) return;

    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    recognitionRef.current = recognition;
    setIsListening(true);
    setCurrentUserText('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const text = result[0].transcript;
        setCurrentUserText(text);
        sendMessage(text);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, isSpeaking, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // End call
  const endCall = useCallback(async () => {
    setCallStatus('ending');
    stopListening();
    if (timerRef.current) clearInterval(timerRef.current);

    if (sessionIdRef.current) {
      try {
        await fetch('/api/voice/session', {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            transcript,
          }),
        });
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }

    setCallStatus('ended');
    setTimeout(onClose, 1500);
  }, [stopListening, transcript, authHeaders, onClose]);

  // Waveform animation bars
  const WaveformBars = ({ active }: { active: boolean }) => (
    <div className="flex items-center gap-1 h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            active ? 'bg-purple-500' : 'bg-gray-600'
          }`}
          style={{
            height: active ? `${12 + Math.random() * 20}px` : '8px',
            animationDelay: `${i * 0.1}s`,
            animation: active ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <p className="text-sm text-gray-400">
            {callStatus === 'connecting' ? 'Connecting...' : callStatus === 'ending' ? 'Ending call...' : callStatus === 'ended' ? 'Call ended' : 'In Call'}
          </p>
          <h2 className="text-xl font-bold text-white mt-1">{characterName}</h2>
        </div>

        {/* Avatar */}
        <div className="flex justify-center py-6">
          <div className={`relative w-32 h-32 rounded-full overflow-hidden border-4 ${
            isSpeaking ? 'border-purple-500 animate-pulse' : isListening ? 'border-green-500' : 'border-gray-600'
          } transition-colors`}>
            {characterAvatarUrl ? (
              <img
                src={characterAvatarUrl}
                alt={characterName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-700 to-blue-700 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {characterName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center">
          <span className="text-2xl font-mono text-white">{formatTime(elapsedSeconds)}</span>
          <p className="text-xs text-gray-500 mt-1">
            {MOMENTS_COSTS.AUDIO_CALL_PER_MINUTE} moments/min
          </p>
        </div>

        {/* Waveform */}
        <div className="flex justify-center py-4">
          <WaveformBars active={isListening || isSpeaking} />
        </div>

        {/* Current text */}
        {(currentUserText || isSpeaking) && (
          <div className="px-6 pb-2">
            <p className="text-sm text-gray-400 text-center truncate">
              {isSpeaking ? `${characterName} is responding...` : currentUserText}
            </p>
          </div>
        )}

        {/* Transcript (collapsed, last 2 entries) */}
        {transcript.length > 0 && (
          <div className="px-6 pb-2 max-h-24 overflow-y-auto">
            {transcript.slice(-2).map((entry, i) => (
              <p
                key={i}
                className={`text-xs mb-1 ${
                  entry.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                }`}
              >
                <span className="font-medium">
                  {entry.role === 'user' ? 'You' : characterName}:
                </span>{' '}
                {entry.content.length > 80 ? entry.content.substring(0, 80) + '...' : entry.content}
              </p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-xs text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 px-6 py-6">
          {/* Push-to-talk button */}
          {callStatus === 'active' && (
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              disabled={isSpeaking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-green-600 scale-110 shadow-lg shadow-green-600/30'
                  : isSpeaking
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 active:bg-green-600'
              }`}
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}

          {/* End call button */}
          <button
            onClick={endCall}
            disabled={callStatus === 'ending' || callStatus === 'ended'}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>

        {/* Push-to-talk hint */}
        {callStatus === 'active' && (
          <p className="text-center text-xs text-gray-500 pb-4">
            Hold the microphone button to speak
          </p>
        )}
      </div>
    </div>
  );
}
