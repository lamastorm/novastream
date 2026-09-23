import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sliders, X, RotateCcw, ChevronDown } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  standard: {
    label: "🎬 Standard",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    bassBoost: 0,
    loudness: 0,
    stereoWidth: 0,
  },
  cinema: {
    label: "🎥 Cinéma",
    brightness: 95,
    contrast: 115,
    saturation: 110,
    sharpness: 0.4,
    bassBoost: 3,
    loudness: 2,
    stereoWidth: 30,
  },
  hdr: {
    label: "✨ HDR Boost",
    brightness: 105,
    contrast: 130,
    saturation: 140,
    sharpness: 0.6,
    bassBoost: 0,
    loudness: 0,
    stereoWidth: 0,
  },
  night: {
    label: "🌙 Nuit",
    brightness: 70,
    contrast: 90,
    saturation: 80,
    sharpness: 0,
    bassBoost: 0,
    loudness: 4,
    stereoWidth: 0,
  },
  vivid: {
    label: "🌈 Vif",
    brightness: 102,
    contrast: 118,
    saturation: 160,
    sharpness: 0.3,
    bassBoost: 4,
    loudness: 3,
    stereoWidth: 50,
  },
};

const DEFAULT = PRESETS.standard;

// ─── Audio Engine ─────────────────────────────────────────────────────────────
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.source = null;
    this.bass = null;
    this.compressor = null;
    this.gain = null;
    this.merger = null;
    this.splitter = null;
    this.connected = false;
  }

  connect(videoEl) {
    if (this.connected) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.ctx.createMediaElementSource(videoEl);

      // Bass shelf filter
      this.bass = this.ctx.createBiquadFilter();
      this.bass.type = "lowshelf";
      this.bass.frequency.value = 120;
      this.bass.gain.value = 0;

      // Compressor (loudness)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 1;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Gain
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 1;

      // Stereo widening via splitter/merger
      this.splitter = this.ctx.createChannelSplitter(2);
      this.merger = this.ctx.createChannelMerger(2);

      // Chain: source → bass → compressor → gain → destination
      this.source.connect(this.bass);
      this.bass.connect(this.compressor);
      this.compressor.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.connected = true;
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch (e) {
      console.warn("[EnhancerPanel] AudioContext failed:", e);
    }
  }

  applySettings(settings) {
    if (!this.connected) return;
    try {
      const now = this.ctx.currentTime;
      this.bass.gain.setTargetAtTime(settings.bassBoost, now, 0.1);

      // Loudness via compressor ratio
      const ratio = 1 + settings.loudness * 0.5;
      this.compressor.ratio.setTargetAtTime(ratio, now, 0.1);
      const threshold = -24 - settings.loudness * 2;
      this.compressor.threshold.setTargetAtTime(threshold, now, 0.1);
    } catch (e) {
      console.warn("[EnhancerPanel] applySettings failed:", e);
    }
  }

  disconnect() {
    try {
      if (this.source) this.source.disconnect();
      if (this.ctx) this.ctx.close();
    } catch (_) {}
    this.connected = false;
  }
}

// ─── Compute CSS filter string ────────────────────────────────────────────────
export function computeVideoFilter(s) {
  // sharpness via custom SVG filter is complex; we use contrast+sepia trick instead
  const parts = [
    `brightness(${s.brightness}%)`,
    `contrast(${s.contrast}%)`,
    `saturate(${s.saturation}%)`,
  ];
  if (s.sharpness > 0) {
    // Approximate sharpness: slight contrast punch
    parts.push(`contrast(${100 + s.sharpness * 10}%)`);
  }
  return parts.join(" ");
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnhancerPanel({ videoRef, isHlsMode, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState("standard");
  const [settings, setSettings] = useState(DEFAULT);
  const audioEngineRef = useRef(new AudioEngine());
  const audioConnected = useRef(false);

  // Connect audio when HLS video is available
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (isHlsMode && videoRef?.current && !audioConnected.current) {
      engine.connect(videoRef.current);
      audioConnected.current = true;
    }
    if (!isHlsMode && audioConnected.current) {
      engine.disconnect();
      audioConnected.current = false;
    }
    return () => {
      if (audioConnected.current) {
        engine.disconnect();
        audioConnected.current = false;
      }
    };
  }, [isHlsMode, videoRef]);

  // Push filter to parent whenever settings change
  useEffect(() => {
    onFilterChange(computeVideoFilter(settings));
    if (audioConnected.current) {
      audioEngineRef.current.applySettings(settings);
    }
  }, [settings]);

  const applyPreset = (key) => {
    setActivePreset(key);
    setSettings({ ...PRESETS[key] });
  };

  const updateSetting = (key, value) => {
    setActivePreset("custom");
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => applyPreset("standard");

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
          open || activePreset !== "standard"
            ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/25"
            : "bg-zinc-800 text-zinc-300 hover:text-white border-white/5"
        }`}
        title="Amélioration Audio & Vidéo"
      >
        <Sliders className="w-4 h-4" />
        <span className="hidden sm:inline">
          {activePreset !== "standard" && activePreset !== "custom"
            ? PRESETS[activePreset]?.label
            : activePreset === "custom"
            ? "✏️ Perso"
            : "Enhance"}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-16 right-4 z-50 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">Amélioration A/V</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Réinitialiser"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Présets</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activePreset === key
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Sliders */}
          <div className="px-4 py-3 border-b border-white/5 space-y-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">🎨 Vidéo</p>
            {[
              { key: "brightness", label: "Luminosité", min: 50, max: 150, unit: "%" },
              { key: "contrast", label: "Contraste", min: 50, max: 200, unit: "%" },
              { key: "saturation", label: "Saturation", min: 0, max: 300, unit: "%" },
              { key: "sharpness", label: "Netteté", min: 0, max: 2, unit: "", step: 0.1 },
            ].map(({ key, label, min, max, unit, step = 1 }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-300">{label}</span>
                  <span className="text-xs text-violet-300 font-mono">
                    {typeof settings[key] === "number" ? settings[key].toFixed(step < 1 ? 1 : 0) : settings[key]}{unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-violet-500 cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Audio Sliders */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">🎵 Audio</p>
              {!isHlsMode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  HLS seulement
                </span>
              )}
            </div>
            {[
              { key: "bassBoost", label: "Basses", min: 0, max: 12, unit: "dB" },
              { key: "loudness", label: "Loudness", min: 0, max: 10, unit: "" },
            ].map(({ key, label, min, max, unit }) => (
              <div key={key} className={!isHlsMode ? "opacity-40 pointer-events-none" : ""}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-300">{label}</span>
                  <span className="text-xs text-violet-300 font-mono">
                    {settings[key]}{unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-violet-500 cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="px-4 pb-3">
            <p className="text-[9px] text-zinc-600 text-center">
              Filtres visuels actifs sur tous les lecteurs • Audio uniquement en mode HLS
            </p>
          </div>
        </div>
      )}
    </>
  );
}
