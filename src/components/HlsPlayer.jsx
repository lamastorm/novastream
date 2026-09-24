import React, { useRef, useState, useEffect } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Sparkles,
  Languages,
  Check,
  Subtitles,
  Sliders,
} from "lucide-react";

export default function HlsPlayer({
  streamUrl,
  title,
  poster,
  onEnded,
  onVideoRef,
  videoFilter,
  preferredLanguage = "vf",
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  // HLS Tracks
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1); // -1 = Off

  // Settings Menu
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "quality" | "audio" | "subs" | "speed"

  // Expose video element to parent
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  // Hide controls automatically after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (Hls.isSupported() && streamUrl.includes(".m3u8")) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // Video Qualities
        const levels = data.levels.map((l, index) => ({
          index,
          height: l.height,
          bitrate: Math.round(l.bitrate / 1000),
        }));
        setQualityLevels(levels);

        // Audio Tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          setAudioTracks(hls.audioTracks);
          const langTarget = preferredLanguage === "vostfr" ? "en" : "fr";
          const matchIdx = hls.audioTracks.findIndex(
            (t) => t.lang?.toLowerCase().startsWith(langTarget)
          );
          if (matchIdx >= 0) {
            hls.audioTrack = matchIdx;
            setSelectedAudio(matchIdx);
          } else {
            setSelectedAudio(hls.audioTrack || 0);
          }
        }

        // Subtitles
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          setSubtitleTracks(hls.subtitleTracks);
          if (preferredLanguage === "vostfr") {
            const frSubIdx = hls.subtitleTracks.findIndex(
              (t) => t.lang?.toLowerCase().startsWith("fr")
            );
            if (frSubIdx >= 0) {
              hls.subtitleTrack = frSubIdx;
              setSelectedSubtitle(frSubIdx);
            }
          }
        }

        video.play().catch(() => {});
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (hls.audioTracks) {
          setAudioTracks([...hls.audioTracks]);
          const langTarget = preferredLanguage === "vostfr" ? "en" : "fr";
          const matchIdx = hls.audioTracks.findIndex(
            (t) => t.lang?.toLowerCase().startsWith(langTarget)
          );
          if (matchIdx >= 0) {
            hls.audioTrack = matchIdx;
            setSelectedAudio(matchIdx);
          }
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setSelectedAudio(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (hls.subtitleTracks) {
          setSubtitleTracks([...hls.subtitleTracks]);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setSelectedSubtitle(data.id);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setSelectedQuality(data.level);
      });

      return () => {
        hls.destroy();
      };
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
    }
  }, [streamUrl, preferredLanguage]);

  // Video Events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleQualityChange = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setSelectedQuality(levelIndex);
      setShowSettings(false);
      setActiveTab("menu");
    }
  };

  const handleAudioChange = (trackIndex) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackIndex;
      setSelectedAudio(trackIndex);
      setShowSettings(false);
      setActiveTab("menu");
    }
  };

  const handleSubtitleChange = (subIndex) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = subIndex;
      setSelectedSubtitle(subIndex);
      setShowSettings(false);
      setActiveTab("menu");
    }
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
    setActiveTab("menu");
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group select-none"
    >
      {/* Native Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        onClick={togglePlay}
        playsInline
        style={videoFilter ? { filter: videoFilter } : undefined}
        className="w-full h-full object-contain cursor-pointer transition-[filter] duration-300"
      />

      {/* Floating Center Play Button when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 p-5 sm:p-6 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all border border-orange-400/40 cursor-pointer shadow-orange-600/40"
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-0.5" />
        </button>
      )}

      {/* Floating Badge (Top Left) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-orange-600/90 text-white font-black text-[10px] tracking-wider uppercase backdrop-blur-md shadow-lg flex items-center gap-1.5 border border-orange-400/30">
          <Sparkles className="w-3 h-3 text-amber-200" />
          <span>Erodium Natif • 0 Pub</span>
        </span>
      </div>

      {/* Custom Video Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 flex flex-col gap-2 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar (Seekbar) */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-700/80 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:h-2.5 transition-all"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              title="-10 secondes"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Forward +10s */}
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 10;
              }}
              title="+10 secondes"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hidden sm:block"
              />
            </div>

            {/* Current / Duration timestamp */}
            <span className="text-xs text-zinc-300 font-mono font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Settings Menu Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setActiveTab("menu");
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showSettings ? "bg-orange-600 text-white" : "text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title="Options de lecture"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Settings Dropdown Panel */}
              {showSettings && (
                <div className="absolute bottom-11 right-0 w-60 p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl text-xs space-y-2.5 z-40 animate-fade-in">
                  {/* MAIN MENU */}
                  {activeTab === "menu" && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <span className="font-bold text-white text-xs">Paramètres du Lecteur</span>
                      </div>

                      {/* Audio option */}
                      {audioTracks.length > 0 && (
                        <button
                          onClick={() => setActiveTab("audio")}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4 text-orange-400" />
                            <span>Audio</span>
                          </div>
                          <span className="text-zinc-400 text-[11px] truncate max-w-[100px]">
                            {audioTracks[selectedAudio]?.name || audioTracks[selectedAudio]?.lang || "Piste 1"}
                          </span>
                        </button>
                      )}

                      {/* Subtitles option */}
                      {subtitleTracks.length > 0 && (
                        <button
                          onClick={() => setActiveTab("subs")}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Subtitles className="w-4 h-4 text-orange-400" />
                            <span>Sous-titres</span>
                          </div>
                          <span className="text-zinc-400 text-[11px] truncate max-w-[100px]">
                            {selectedSubtitle === -1
                              ? "Désactivé"
                              : subtitleTracks[selectedSubtitle]?.name || "Actif"}
                          </span>
                        </button>
                      )}

                      {/* Quality option */}
                      {qualityLevels.length > 0 && (
                        <button
                          onClick={() => setActiveTab("quality")}
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-orange-400" />
                            <span>Qualité</span>
                          </div>
                          <span className="text-zinc-400 text-[11px]">
                            {selectedQuality === -1
                              ? "Auto"
                              : `${qualityLevels[selectedQuality]?.height}p`}
                          </span>
                        </button>
                      )}

                      {/* Speed option */}
                      <button
                        onClick={() => setActiveTab("speed")}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4 text-orange-400" />
                          <span>Vitesse</span>
                        </div>
                        <span className="text-zinc-400 text-[11px]">{playbackRate}x</span>
                      </button>
                    </div>
                  )}

                  {/* AUDIO SUBMENU */}
                  {activeTab === "audio" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1">
                        <button
                          onClick={() => setActiveTab("menu")}
                          className="text-orange-400 font-bold hover:underline"
                        >
                          ← Retour
                        </button>
                        <span className="font-bold text-white text-xs">Piste Audio</span>
                      </div>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {audioTracks.map((track, idx) => {
                          const isFr = track.lang?.toLowerCase().startsWith("fr") || track.name?.toLowerCase().includes("french") || track.name?.toLowerCase().includes("français");
                          const isEn = track.lang?.toLowerCase().startsWith("en") || track.name?.toLowerCase().includes("english") || track.name?.toLowerCase().includes("anglais");
                          const label = isFr ? "🇫🇷 Français 5.1" : isEn ? "🇬🇧 Anglais 5.1" : (track.name || `Piste ${idx + 1}`);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAudioChange(idx)}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                                selectedAudio === idx
                                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <span>{label}</span>
                              {selectedAudio === idx && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUBTITLES SUBMENU */}
                  {activeTab === "subs" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1">
                        <button
                          onClick={() => setActiveTab("menu")}
                          className="text-orange-400 font-bold hover:underline"
                        >
                          ← Retour
                        </button>
                        <span className="font-bold text-white text-xs">Sous-titres</span>
                      </div>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => handleSubtitleChange(-1)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                            selectedSubtitle === -1
                              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <span>Désactivé</span>
                          {selectedSubtitle === -1 && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {subtitleTracks.map((sub, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSubtitleChange(idx)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                              selectedSubtitle === idx
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold"
                                : "text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            <span>{sub.name || sub.lang || `Sous-titre ${idx + 1}`}</span>
                            {selectedSubtitle === idx && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUALITY SUBMENU */}
                  {activeTab === "quality" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1">
                        <button
                          onClick={() => setActiveTab("menu")}
                          className="text-orange-400 font-bold hover:underline"
                        >
                          ← Retour
                        </button>
                        <span className="font-bold text-white text-xs">Qualité Vidéo</span>
                      </div>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                            selectedQuality === -1
                              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <span>Auto (Adaptatif)</span>
                          {selectedQuality === -1 && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {qualityLevels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => handleQualityChange(lvl.index)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                              selectedQuality === lvl.index
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold"
                                : "text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            <span>{lvl.height}p ({lvl.bitrate} kbps)</span>
                            {selectedQuality === lvl.index && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SPEED SUBMENU */}
                  {activeTab === "speed" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1">
                        <button
                          onClick={() => setActiveTab("menu")}
                          className="text-orange-400 font-bold hover:underline"
                        >
                          ← Retour
                        </button>
                        <span className="font-bold text-white text-xs">Vitesse de lecture</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {[0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`py-1.5 rounded-xl text-center cursor-pointer transition-all ${
                              playbackRate === speed
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold shadow-md shadow-orange-600/30"
                                : "text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
