import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Square, Volume2, VolumeX, RotateCcw, Shuffle, 
  Download, Music, Sliders, Radio, Zap, Layers, Activity, Save, 
  FileJson, Sparkles, Plus, Trash2, Globe
} from 'lucide-react';

// --- Web Audio Synthesizer Engine ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.analyser = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master Chain setup
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Master Low-Pass Filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);

    // Simple delay-based Reverb unit
    this.reverbNode = this.ctx.createDelay();
    this.reverbNode.delayTime.setValueAtTime(0.12, this.ctx.currentTime);
    const feedback = this.ctx.createGain();
    feedback.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.reverbNode.connect(feedback);
    feedback.connect(this.reverbNode);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.reverbNode.connect(this.reverbGain);

    // Master Visualizer Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;

    // Signal Routing: Source -> Filter -> Master Gain -> Analyser -> Destination
    // Reverb Routing: Filter -> Reverb -> ReverbGain -> Master Gain
    this.filterNode.connect(this.masterGain);
    this.filterNode.connect(this.reverbNode);
    this.reverbGain.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Synthesis methods
  playKick(time, pan = 0, vol = 1, pitch = 0) {
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    const baseFreq = 130 * Math.pow(2, pitch / 12);
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);

    gain.gain.setValueAtTime(1.2 * vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    if (panner) {
      panner.pan.setValueAtTime(pan, time);
      gain.connect(panner);
      panner.connect(this.filterNode);
    } else {
      gain.connect(this.filterNode);
    }

    osc.start(time);
    osc.stop(time + 0.4);
  }

  playSnare(time, pan = 0, vol = 1, pitch = 0) {
    this.ensureContext();
    // Noise component
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1 * vol, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Tonal Body component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const baseFreq = 180 * Math.pow(2, pitch / 12);
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);

    oscGain.gain.setValueAtTime(0.7 * vol, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.connect(oscGain);

    const mixGain = this.ctx.createGain();
    noiseGain.connect(mixGain);
    oscGain.connect(mixGain);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, time);
      mixGain.connect(panner);
      panner.connect(this.filterNode);
    } else {
      mixGain.connect(this.filterNode);
    }

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.2);
    osc.stop(time + 0.1);
  }

  playHiHat(time, isOpen = false, pan = 0, vol = 1, pitch = 0) {
    this.ensureContext();
    const duration = isOpen ? 0.35 : 0.08;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    const cutoff = (isOpen ? 6000 : 8000) * Math.pow(2, pitch / 12);
    filter.frequency.setValueAtTime(Math.min(cutoff, 18000), time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, time);
      gain.connect(panner);
      panner.connect(this.filterNode);
    } else {
      gain.connect(this.filterNode);
    }

    noise.start(time);
    noise.stop(time + duration);
  }

  playClap(time, pan = 0, vol = 1, pitch = 0) {
    this.ensureContext();
    const duration = 0.25;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 * Math.pow(2, pitch / 12), time);
    filter.Q.setValueAtTime(3, time);

    const gain = this.ctx.createGain();
    // Multi-pulse burst for realistic clap echo
    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.8 * vol, time + 0.0);
    gain.gain.setValueAtTime(0.1, time + 0.01);
    gain.gain.setValueAtTime(0.8 * vol, time + 0.02);
    gain.gain.setValueAtTime(0.1, time + 0.03);
    gain.gain.setValueAtTime(0.9 * vol, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, time);
      gain.connect(panner);
      panner.connect(this.filterNode);
    } else {
      gain.connect(this.filterNode);
    }

    noise.start(time);
    noise.stop(time + duration);
  }

  playSynth(time, freq = 261.63, pan = 0, vol = 1, pitch = 0) {
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const actualFreq = freq * Math.pow(2, pitch / 12);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(actualFreq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(actualFreq * 1.005, time); // slight detune

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(actualFreq * 4, time);
    filter.frequency.exponentialRampToValueAtTime(actualFreq * 0.8, time + 0.3);

    gain.gain.setValueAtTime(0.5 * vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, time);
      gain.connect(panner);
      panner.connect(this.filterNode);
    } else {
      gain.connect(this.filterNode);
    }

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.35);
    osc2.stop(time + 0.35);
  }

  updateMaster(vol, cutoff, reverbAmt) {
    if (!this.isInitialized) return;
    this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    this.filterNode.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
    this.reverbGain.gain.setValueAtTime(reverbAmt, this.ctx.currentTime);
  }
}

const audioEngine = new SoundEngine();

// Scale definitions for Synth Piano Roll
const NOTES = [
  { name: 'C5', freq: 523.25 },
  { name: 'B4', freq: 493.88 },
  { name: 'A4', freq: 440.00 },
  { name: 'G4', freq: 392.00 },
  { name: 'F4', freq: 349.23 },
  { name: 'E4', freq: 329.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'C4', freq: 261.63 },
  { name: 'B3', freq: 246.94 },
  { name: 'A3', freq: 220.00 },
  { name: 'G3', freq: 196.00 },
  { name: 'C3', freq: 130.81 },
];

const INITIAL_TRACKS = [
  {
    id: 'kick',
    name: 'Kick Drum',
    color: '#f97316', // FL Orange
    type: 'kick',
    volume: 0.9,
    pan: 0,
    pitch: 0,
    mute: false,
    solo: false,
    steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]
  },
  {
    id: 'snare',
    name: 'Snare 808',
    color: '#3b82f6', // FL Blue
    type: 'snare',
    volume: 0.8,
    pan: 0,
    pitch: 0,
    mute: false,
    solo: false,
    steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
  },
  {
    id: 'hihat_c',
    name: 'Closed Hat',
    color: '#10b981', // FL Green
    type: 'hihat_c',
    volume: 0.75,
    pan: -0.2,
    pitch: 0,
    mute: false,
    solo: false,
    steps: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
  },
  {
    id: 'hihat_o',
    name: 'Open Hat',
    color: '#8b5cf6', // FL Purple
    type: 'hihat_o',
    volume: 0.7,
    pan: 0.2,
    pitch: 0,
    mute: false,
    solo: false,
    steps: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
  },
  {
    id: 'clap',
    name: 'Studio Clap',
    color: '#ec4899', // Pink
    type: 'clap',
    volume: 0.8,
    pan: 0,
    pitch: 0,
    mute: false,
    solo: false,
    steps: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0]
  },
  {
    id: 'synth',
    name: 'Synth Lead',
    color: '#eab308', // Yellow
    type: 'synth',
    volume: 0.85,
    pan: 0,
    pitch: 0,
    mute: false,
    solo: false,
    // Step values store note frequencies or 0 for off
    steps: [261.63,0,0,261.63, 329.63,0,0,0, 392.00,0,0,349.23, 329.63,0,293.66,0]
  }
];

// Presets
const PRESETS = {
  trap: {
    bpm: 140,
    tracks: [
      { id: 'kick', steps: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0] },
      { id: 'snare', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
      { id: 'hihat_c', steps: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] },
      { id: 'hihat_o', steps: [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0] },
      { id: 'clap', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
      { id: 'synth', steps: [130.81,0,130.81,0, 0,0,130.81,0, 196.00,0,0,0, 130.81,0,0,0] }
    ]
  },
  boombap: {
    bpm: 90,
    tracks: [
      { id: 'kick', steps: [1,0,0,1, 0,0,0,0, 0,1,1,0, 0,0,0,0] },
      { id: 'snare', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
      { id: 'hihat_c', steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
      { id: 'hihat_o', steps: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0] },
      { id: 'clap', steps: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] },
      { id: 'synth', steps: [261.63,0,0,329.63, 0,0,392.00,0, 349.23,0,329.63,0, 293.66,0,0,0] }
    ]
  },
  synthwave: {
    bpm: 120,
    tracks: [
      { id: 'kick', steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
      { id: 'snare', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
      { id: 'hihat_c', steps: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] },
      { id: 'hihat_o', steps: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1] },
      { id: 'clap', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
      { id: 'synth', steps: [261.63,261.63,329.63,0, 392.00,392.00,440.00,0, 523.25,0,440.00,0, 392.00,0,329.63,0] }
    ]
  }
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(128);
  const [currentStep, setCurrentStep] = useState(0);
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
  
  // Master FX States
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [cutoffFreq, setCutoffFreq] = useState(16000);
  const [reverbAmount, setReverbAmount] = useState(0.2);

  // Active Piano Roll Modal step for Synth
  const [pianoRollStep, setPianoRollStep] = useState(null);

  // Tap Tempo state
  const lastTapRef = useRef(0);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Audio Sequencer Scheduler Refs
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIdRef = useRef(null);

  // Update Master Controls
  useEffect(() => {
    audioEngine.updateMaster(masterVolume, cutoffFreq, reverbAmount);
  }, [masterVolume, cutoffFreq, reverbAmount]);

  // Audio Processing Function called at precise timing intervals
  const triggerAudioStep = useCallback((stepIndex, time) => {
    const hasSolo = tracks.some(t => t.solo);

    tracks.forEach(track => {
      if (track.mute) return;
      if (hasSolo && !track.solo) return;

      const stepValue = track.steps[stepIndex];
      if (!stepValue) return;

      switch (track.type) {
        case 'kick':
          audioEngine.playKick(time, track.pan, track.volume, track.pitch);
          break;
        case 'snare':
          audioEngine.playSnare(time, track.pan, track.volume, track.pitch);
          break;
        case 'hihat_c':
          audioEngine.playHiHat(time, false, track.pan, track.volume, track.pitch);
          break;
        case 'hihat_o':
          audioEngine.playHiHat(time, true, track.pan, track.volume, track.pitch);
          break;
        case 'clap':
          audioEngine.playClap(time, track.pan, track.volume, track.pitch);
          break;
        case 'synth':
          if (typeof stepValue === 'number' && stepValue > 0) {
            audioEngine.playSynth(time, stepValue, track.pan, track.volume, track.pitch);
          }
          break;
        default:
          break;
      }
    });
  }, [tracks]);

  // Scheduler Loop for Web Audio Precision
  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioEngine.ctx.currentTime + 0.1) {
      triggerAudioStep(currentStepRef.current, nextNoteTimeRef.current);

      // Advance 16th note timing
      const secondsPerBeat = 60.0 / bpm;
      const secondsPer16th = secondsPerBeat / 4;
      nextNoteTimeRef.current += secondsPer16th;

      // Advance step counter visually
      const stepToRender = currentStepRef.current;
      setTimeout(() => {
        setCurrentStep(stepToRender);
      }, (nextNoteTimeRef.current - audioEngine.ctx.currentTime) * 1000);

      currentStepRef.current = (currentStepRef.current + 1) % 16;
    }
    timerIdRef.current = setTimeout(scheduler, 25);
  }, [bpm, triggerAudioStep]);

  // Play/Pause Engine Logic
  useEffect(() => {
    if (isPlaying) {
      audioEngine.ensureContext();
      currentStepRef.current = 0;
      nextNoteTimeRef.current = audioEngine.ctx.currentTime + 0.05;
      scheduler();
    } else {
      clearTimeout(timerIdRef.current);
      setCurrentStep(0);
    }
    return () => clearTimeout(timerIdRef.current);
  }, [isPlaying, scheduler]);

  // Visualizer Spectrum Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      if (!audioEngine.analyser) {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const bufferLength = audioEngine.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      audioEngine.analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient styling matching FL Studio Orange-Green peak look
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.6, '#f59e0b');
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handlers for Step Toggle & Track Adjustments
  const toggleStep = (trackId, stepIndex) => {
    audioEngine.ensureContext();
    setTracks(prev => prev.map(tr => {
      if (tr.id !== trackId) return tr;
      const newSteps = [...tr.steps];
      if (tr.type === 'synth') {
        // Open Piano Roll Modal for synth step customization
        setPianoRollStep({ trackId, stepIndex, currentFreq: newSteps[stepIndex] });
      } else {
        newSteps[stepIndex] = newSteps[stepIndex] ? 0 : 1;
        // Audition hit on user click
        if (newSteps[stepIndex]) {
          triggerAudioStep(stepIndex, audioEngine.ctx ? audioEngine.ctx.currentTime : 0);
        }
      }
      return { ...tr, steps: newSteps };
    }));
  };

  const setSynthStepNote = (freq) => {
    if (!pianoRollStep) return;
    const { trackId, stepIndex } = pianoRollStep;
    setTracks(prev => prev.map(tr => {
      if (tr.id !== trackId) return tr;
      const newSteps = [...tr.steps];
      newSteps[stepIndex] = freq;
      return { ...tr, steps: newSteps };
    }));
    // Audition sound
    if (freq > 0) {
      audioEngine.playSynth(audioEngine.ctx.currentTime, freq, 0, 0.8, 0);
    }
    setPianoRollStep(null);
  };

  const updateTrackParam = (trackId, param, value) => {
    setTracks(prev => prev.map(tr => tr.id === trackId ? { ...tr, [param]: value } : tr));
  };

  const handleTapTempo = () => {
    const now = Date.now();
    if (lastTapRef.current) {
      const diff = now - lastTapRef.current;
      if (diff > 300 && diff < 2000) {
        const calculatedBpm = Math.round(60000 / diff);
        setBpm(Math.min(Math.max(calculatedBpm, 60), 200));
      }
    }
    lastTapRef.current = now;
  };

  const loadPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setBpm(preset.bpm);
    setTracks(prev => prev.map(tr => {
      const match = preset.tracks.find(pt => pt.id === tr.id);
      return match ? { ...tr, steps: [...match.steps] } : tr;
    }));
  };

  const clearPattern = () => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      steps: tr.steps.map(() => 0)
    })));
  };

  const randomizePattern = () => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      steps: tr.steps.map(() => {
        if (tr.type === 'synth') {
          return Math.random() > 0.65 ? NOTES[Math.floor(Math.random() * NOTES.length)].freq : 0;
        }
        return Math.random() > 0.6 ? 1 : 0;
      })
    })));
  };

  const exportPatternJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ bpm, tracks }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fl_beatmaker_pattern_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col select-none border-t-4 border-amber-500">
      
      {/* --- DAW HEADER / TOP TOOLBAR --- */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-5 h-5 text-zinc-950 font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-zinc-100 uppercase flex items-center gap-2">
              FL Studio <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">WEB EDITION</span>
            </h1>
            <p className="text-xs text-zinc-400">Digital Audio Workstation & Step Sequencer</p>
          </div>
        </div>

        {/* Global Transport Controls */}
        <div className="flex items-center space-x-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => { audioEngine.ensureContext(); setIsPlaying(!isPlaying); }}
            className={`p-2.5 rounded-md flex items-center gap-2 font-bold transition ${
              isPlaying 
                ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => setIsPlaying(false)}
            className="p-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Stop"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1" />

          {/* BPM Knob / Control */}
          <div className="flex items-center space-x-2 px-2">
            <span className="text-xs font-bold text-zinc-400">BPM</span>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 bg-zinc-900 border border-zinc-700 text-amber-400 font-mono font-bold text-center rounded py-1 text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleTapTempo}
              className="text-xs px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold uppercase transition"
            >
              TAP
            </button>
          </div>
        </div>

        {/* Presets & Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-1">
            <span className="text-xs text-zinc-400 px-2 font-semibold">Presets:</span>
            <button 
              onClick={() => loadPreset('trap')}
              className="text-xs px-2 py-1 hover:bg-zinc-800 text-zinc-300 rounded"
            >
              Trap
            </button>
            <button 
              onClick={() => loadPreset('boombap')}
              className="text-xs px-2 py-1 hover:bg-zinc-800 text-zinc-300 rounded"
            >
              BoomBap
            </button>
            <button 
              onClick={() => loadPreset('synthwave')}
              className="text-xs px-2 py-1 hover:bg-zinc-800 text-zinc-300 rounded"
            >
              Synthwave
            </button>
          </div>

          <button
            onClick={randomizePattern}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition"
            title="Randomize Pattern"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={clearPattern}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-rose-400 rounded-md transition"
            title="Clear Pattern"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={exportPatternJSON}
            className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md transition flex items-center gap-1 text-xs font-bold"
            title="Export Pattern JSON"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT</span>
          </button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4 bg-zinc-950">
        
        {/* LEFT/CENTER: CHANNEL RACK / STEP SEQUENCER */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
          
          {/* Rack Toolbar */}
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">Channel Rack</h2>
              <span className="text-xs text-zinc-500 font-mono">(16 Steps)</span>
            </div>

            {/* Playhead indicator bar */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-1.5 rounded-full transition-all ${
                    currentStep === i && isPlaying ? 'bg-amber-400 shadow-md shadow-amber-400/80 scale-125' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tracks Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition hover:border-zinc-700"
              >
                {/* Track Controls */}
                <div className="flex items-center gap-2 min-w-[220px]">
                  {/* Track Color Strip */}
                  <div
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />

                  {/* Track Mute / Solo */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => updateTrackParam(track.id, 'mute', !track.mute)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        track.mute 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                          : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => updateTrackParam(track.id, 'solo', !track.solo)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        track.solo 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                          : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
                      }`}
                    >
                      S
                    </button>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-200 truncate flex items-center justify-between">
                      <span>{track.name}</span>
                      {track.type === 'synth' && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">P.ROLL</span>
                      )}
                    </div>

                    {/* Volume & Pan Sliders */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[9px] text-zinc-500 font-bold">VOL</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) => updateTrackParam(track.id, 'volume', Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[9px] text-zinc-500 font-bold">PAN</span>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.1"
                          value={track.pan}
                          onChange={(e) => updateTrackParam(track.id, 'pan', Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step Grid (16 Steps divided into 4 bar segments) */}
                <div className="flex-1 grid grid-cols-16 gap-1 sm:gap-1.5 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800/50">
                  {track.steps.map((stepVal, stepIdx) => {
                    const isActive = Boolean(stepVal);
                    const isCurrentPlayhead = currentStep === stepIdx && isPlaying;
                    const isBarGroup = Math.floor(stepIdx / 4) % 2 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => toggleStep(track.id, stepIdx)}
                        className={`h-10 rounded transition-all flex flex-col items-center justify-center relative ${
                          isBarGroup ? 'bg-zinc-800/90' : 'bg-zinc-800/40'
                        } ${
                          isActive 
                            ? 'shadow-inner font-bold border' 
                            : 'hover:bg-zinc-700/50 border border-transparent'
                        } ${
                          isCurrentPlayhead 
                            ? 'ring-2 ring-amber-400 scale-105 z-10' 
                            : ''
                        }`}
                        style={{
                          borderColor: isActive ? track.color : 'transparent',
                          backgroundColor: isActive ? `${track.color}40` : undefined
                        }}
                      >
                        {/* Step active indicator dot */}
                        <div
                          className={`w-2 h-2 rounded-full transition-transform ${
                            isActive ? 'scale-100' : 'scale-0'
                          }`}
                          style={{ backgroundColor: track.color }}
                        />

                        {/* Synth Note Name text preview */}
                        {track.type === 'synth' && isActive && (
                          <span className="text-[8px] font-mono font-bold text-amber-300 mt-0.5 truncate w-full text-center px-0.5">
                            {NOTES.find(n => Math.abs(n.freq - stepVal) < 1)?.name || 'ON'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* RIGHT: MASTER MIXER & VISUALIZER */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          
          {/* Master Spectrum Visualizer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Audio Spectrum
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">MASTER OUT</span>
            </div>
            <canvas
              ref={canvasRef}
              width={280}
              height={100}
              className="w-full h-24 bg-zinc-950 rounded-lg border border-zinc-800/80"
            />
          </div>

          {/* Master Effects & Controls */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">Master Rack FX</h2>
            </div>

            {/* Master Volume */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Master Volume</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-zinc-800"
              />
            </div>

            {/* Filter Cutoff */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Master Filter Cutoff</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(cutoffFreq)} Hz</span>
              </div>
              <input
                type="range"
                min="200"
                max="20000"
                step="100"
                value={cutoffFreq}
                onChange={(e) => setCutoffFreq(Number(e.target.value))}
                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-zinc-800"
              />
            </div>

            {/* Reverb Send */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Space Reverb Send</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(reverbAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={reverbAmount}
                onChange={(e) => setReverbAmount(Number(e.target.value))}
                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-zinc-800"
              />
            </div>

            {/* Info Footer Box */}
            <div className="mt-auto bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center text-amber-400 font-bold gap-1">
                <Zap className="w-3.5 h-3.5" /> DAW Tips:
              </div>
              <p className="text-[11px] leading-relaxed">
                Click synth steps to launch the <strong className="text-zinc-200">Piano Roll</strong>. Adjust Master Cutoff for smooth build-ups and drops!
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* --- PIANO ROLL MODAL FOR SYNTH TRACK --- */}
      {pianoRollStep && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-400" /> Piano Roll Step Inspector
                </h3>
                <p className="text-xs text-zinc-400">Step #{pianoRollStep.stepIndex + 1}</p>
              </div>
              <button
                onClick={() => setPianoRollStep(null)}
                className="text-zinc-400 hover:text-zinc-100 font-bold px-2 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Note Picker List */}
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => setSynthStepNote(0)}
                className={`w-full py-2 px-3 rounded font-bold text-xs text-left transition flex items-center justify-between ${
                  pianoRollStep.currentFreq === 0 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span>MUTE / OFF</span>
                <span className="text-[10px] opacity-60">Clear Step</span>
              </button>

              {NOTES.map((note) => {
                const isSelected = Math.abs(note.freq - pianoRollStep.currentFreq) < 1;
                const isSharp = note.name.includes('#');

                return (
                  <button
                    key={note.name}
                    onClick={() => setSynthStepNote(note.freq)}
                    className={`w-full py-2 px-3 rounded font-bold text-xs text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border border-amber-400 shadow-md'
                        : isSharp
                          ? 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                          : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    <span>{note.name}</span>
                    <span className="font-mono text-[10px] opacity-70">{Math.round(note.freq)} Hz</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setPianoRollStep(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}