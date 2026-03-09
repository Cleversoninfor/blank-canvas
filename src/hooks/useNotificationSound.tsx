import { useCallback, useEffect, useState } from 'react';

// === GLOBAL SOUND MANAGER ===
let audioContext: AudioContext | null = null;
let isCurrentlyEnabled = localStorage.getItem('notification-sound-enabled') !== 'false';
const listeners = new Set<() => void>();

// Alarm state with session tracking to prevent race conditions
let alarmPlaying = false;
let alarmSessionId = 0;

// We use multiple timeouts (on + off) per cycle; keep track so we can reliably stop.
const alarmTimeoutIds = new Set<ReturnType<typeof setTimeout>>();

let currentAlarmNodes: {
  mainOsc: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
} | null = null;

function notifyAllListeners() {
  listeners.forEach((fn) => fn());
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function safeResume(ctx: AudioContext) {
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
}

function clearAlarmTimeouts() {
  alarmTimeoutIds.forEach((id) => clearTimeout(id));
  alarmTimeoutIds.clear();
}

function stopCurrentBurst() {
  if (!currentAlarmNodes) return;

  const nodes = currentAlarmNodes;
  currentAlarmNodes = null;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Immediately ramp down the gain
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value || 0.2, now);
    nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.02);

    // Stop oscillators immediately - no timeout delay
    try {
      nodes.mainOsc.stop(now + 0.03);
      nodes.lfo.stop(now + 0.03);
    } catch {
      // May already be stopped
    }

    // Disconnect nodes after a short delay
    setTimeout(() => {
      try {
        nodes.mainOsc.disconnect();
        nodes.lfo.disconnect();
        nodes.lfoGain.disconnect();
        nodes.gain.disconnect();
      } catch {
        // ignore
      }
    }, 50);
  } catch (error) {
    console.error('[Sound] Stop burst error:', error);
  }
}

function playBurst(sessionId: number) {
  // Double-check session ID and alarm state
  if (!alarmPlaying || sessionId !== alarmSessionId || currentAlarmNodes) return;

  try {
    const ctx = getAudioContext();
    safeResume(ctx);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.connect(ctx.destination);

    const mainOsc = ctx.createOscillator();
    mainOsc.type = 'square';
    mainOsc.frequency.setValueAtTime(1800, ctx.currentTime);
    mainOsc.connect(gain);

    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(8, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);

    mainOsc.start();
    lfo.start();

    currentAlarmNodes = { mainOsc, lfo, lfoGain, gain };
  } catch (error) {
    console.error('[Sound] Play burst error:', error);
  }
}

function runAlarmCycle(sessionId: number) {
  // Check if this session is still valid
  if (!alarmPlaying || sessionId !== alarmSessionId) return;

  // Play for 1.5 seconds
  playBurst(sessionId);

  const stopId = setTimeout(() => {
    // Re-check session before stopping
    if (!alarmPlaying || sessionId !== alarmSessionId) return;
    stopCurrentBurst();

    // Pause for 1 second, then repeat
    const nextId = setTimeout(() => {
      if (alarmPlaying && sessionId === alarmSessionId) {
        runAlarmCycle(sessionId);
      }
    }, 1000);

    alarmTimeoutIds.add(nextId);
  }, 1500);

  alarmTimeoutIds.add(stopId);
}

function startAlarmSound() {
  if (alarmPlaying) return;
  if (!isCurrentlyEnabled) return;

  // Safety: clear any leftover timers from past cycles
  clearAlarmTimeouts();
  stopCurrentBurst();

  // Increment session ID to invalidate any stale callbacks
  alarmSessionId++;
  const currentSession = alarmSessionId;

  alarmPlaying = true;
  runAlarmCycle(currentSession);
  notifyAllListeners();
}

function stopAlarmSound() {
  console.log('[Sound] stopAlarmSound called, alarmPlaying:', alarmPlaying);
  
  // Always try to stop, even if alarmPlaying is false (defensive)
  // First, mark as not playing and increment session to invalidate callbacks
  alarmPlaying = false;
  alarmSessionId++;
  
  // Then clear all pending timeouts IMMEDIATELY
  clearAlarmTimeouts();
  
  // Finally stop any currently playing audio SYNCHRONOUSLY
  stopCurrentBurst();
  
  // Close and recreate audio context to ensure clean slate
  if (audioContext) {
    try {
      audioContext.close().catch(() => {});
    } catch {
      // ignore
    }
    audioContext = null;
  }
  
  console.log('[Sound] Alarm stopped, session:', alarmSessionId);
  notifyAllListeners();
}

function setGlobalEnabled(enabled: boolean) {
  isCurrentlyEnabled = enabled;
  localStorage.setItem('notification-sound-enabled', String(enabled));
  if (!enabled) {
    stopAlarmSound();
  }
  notifyAllListeners();
}

function getIsAlarmPlaying() {
  return alarmPlaying;
}

function getIsEnabled() {
  return isCurrentlyEnabled;
}

// === REACT HOOK ===
export function useNotificationSound() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const startAlarm = useCallback(() => {
    startAlarmSound();
  }, []);

  const stopAlarm = useCallback(() => {
    stopAlarmSound();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setGlobalEnabled(enabled);
  }, []);

  return {
    startAlarm,
    stopAlarm,
    setEnabled,
    isEnabled: getIsEnabled(),
    isAlarmPlaying: getIsAlarmPlaying(),
  };
}

