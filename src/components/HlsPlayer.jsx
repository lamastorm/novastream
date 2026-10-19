import React, { useRef, useState, useEffect, useMemo } from "react";
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
  SkipForward,
  SkipBack,
  ListVideo,
  FastForward,
  X,
} from "lucide-react";
import { storage } from "../services/storage";

const SKIP_LABELS = {
  intro: "Passer l'intro",
  recap: "Passer le récap",
  credits: "Passer le générique",
  outro: "Passer l'outro",
  preview: "Passer l'aperçu",
};

export default function HlsPlayer({
  streamUrl,
  title,
  poster,
  onEnded,
  onVideoRef,
  videoFilter,
  preferredLanguage = "vf",
  externalSubtitles = [],
  skipSegments = [],
  tmdbId = null,
  mediaType = "movie",
  season = 1,
  episode = 1,
  isTV = false,
  nextEpisodeLabel = null,
  onNextEpisode = null,
  onPrevEpisode = null,
  onOpenEpisodes = null,
  autoNext = true,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const autoNextTriggeredRef = useRef(false);
  const hasRestoredPositionRef = useRef(false);
  const hasAutoSelectedAudioRef = useRef(false);
  const lastMediaRecoverRef = useRef(0);
  const lastSavedWallTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resumedFromTime, setResumedFromTime] = useState(null);

  // HLS Tracks
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1); // -1 = Off

  const [isBuffering, setIsBuffering] = useState(true);

  // Skip Intro / Outro & Next Episode states
  const [fetchedSegments, setFetchedSegments] = useState([]);
  const [dismissedSegmentKey, setDismissedSegmentKey] = useState(null);
  const [dismissedNextBanner, setDismissedNextBanner] = useState(false);
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => {
    try {
      return localStorage.getItem("erodium_auto_skip_intro") === "true";
    } catch {
      return false;
    }
  });

  // Settings Menu
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "quality" | "audio" | "subs" | "speed"

  // Reset per-episode transient states when stream or episode changes
  useEffect(() => {
    setDismissedSegmentKey(null);
    setDismissedNextBanner(false);
    setResumedFromTime(null);
    setBufferedEnd(0);
    autoNextTriggeredRef.current = false;
    hasRestoredPositionRef.current = false;
    hasAutoSelectedAudioRef.current = false;
  }, [streamUrl, preferredLanguage, tmdbId, season, episode]);

  // Extract tmdbId / season / episode from streamUrl as fallback if needed
  const resolvedMeta = useMemo(() => {
    let id = tmdbId;
    let s = season;
    let e = episode;
    let tv = isTV || mediaType === "tv" || mediaType === "anime";
    if (streamUrl) {
      const decoded = decodeURIComponent(streamUrl);
      const idMatch = decoded.match(/\/(tv|movie)\/(\d+)/i);
      if (idMatch) {
        if (!id) id = idMatch[2];
        if (idMatch[1].toLowerCase() === "tv") tv = true;
      }
      const seMatch = decoded.match(/\/S(\d+)\/E(\d+)\//i);
      if (seMatch) {
        if (!s) s = Number(seMatch[1]);
        if (!e) e = Number(seMatch[2]);
        tv = true;
      }
    }
    const fallbackId = id || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "_") : null);
    return { tmdbId: fallbackId, season: s || 1, episode: e || 1, isTV: tv };
  }, [tmdbId, season, episode, isTV, mediaType, streamUrl, title]);

  // Fetch skip segments from TheIntroDB if not already provided by backend
  useEffect(() => {
    if (Array.isArray(skipSegments) && skipSegments.length > 0) {
      setFetchedSegments(skipSegments);
      return;
    }
    if (!resolvedMeta.tmdbId) {
      setFetchedSegments([]);
      return;
    }

    const typeNorm = resolvedMeta.isTV ? "tv" : "movie";
    const cacheKey = `introdb_v3_${typeNorm}_${resolvedMeta.tmdbId}_${
      typeNorm === "tv" ? `${resolvedMeta.season}_${resolvedMeta.episode}` : "movie"
    }`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFetchedSegments(parsed);
          return;
        }
      }
    } catch {}

    let cancelled = false;
    const params = new URLSearchParams({ tmdb_id: String(resolvedMeta.tmdbId) });
    if (typeNorm === "tv") {
      params.set("season", String(resolvedMeta.season));
      params.set("episode", String(resolvedMeta.episode));
    }

    fetch(`https://api.theintrodb.org/v3/media?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const segments = [];
        for (const segType of ["intro", "recap", "credits", "preview"]) {
          const list = Array.isArray(data[segType]) ? data[segType] : [];
          for (const item of list) {
            const startMs = item?.start_ms ?? 0;
            const endMs = item?.end_ms ?? null;
            if (endMs === null || endMs > startMs) {
              segments.push({ type: segType, startMs, endMs });
            }
          }
        }
        setFetchedSegments(segments);
        try {
          if (segments.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify(segments));
          }
        } catch {}
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [skipSegments, resolvedMeta.tmdbId, resolvedMeta.isTV, resolvedMeta.season, resolvedMeta.episode]);

  const effectiveSegments = useMemo(() => {
    return Array.isArray(skipSegments) && skipSegments.length > 0 ? skipSegments : fetchedSegments;
  }, [skipSegments, fetchedSegments]);

  // Determine currently active skip segment (intro / recap / credits / preview)
  const activeSkipSegment = useMemo(() => {
    if (!effectiveSegments.length) return null;
    const currentMs = currentTime * 1000;
    for (const seg of effectiveSegments) {
      const startMs = seg.startMs ?? 0;
      const endMs = seg.endMs ?? null;
      const inStart = currentMs >= startMs;
      const inEnd =
        endMs !== null
          ? currentMs < endMs - 500
          : duration > 0
          ? currentMs < duration * 1000 - 1500
          : true;
      if (inStart && inEnd) {
        const key = `${seg.type}_${startMs}_${endMs}`;
        if (dismissedSegmentKey === key) return null;
        return { ...seg, key };
      }
    }
    return null;
  }, [effectiveSegments, currentTime, duration, dismissedSegmentKey]);

  // Execute skip action
  const handleSkipSegment = (seg = activeSkipSegment) => {
    if (!seg || !videoRef.current) return;
    const isEndCredits =
      (seg.type === "credits" || seg.type === "outro") &&
      (seg.endMs === null || (duration > 0 && seg.endMs / 1000 >= duration - 15));

    if (isEndCredits && resolvedMeta.isTV && onNextEpisode) {
      onNextEpisode();
      return;
    }

    if (seg.endMs !== null && seg.endMs !== undefined) {
      const maxTime = duration > 0 ? Math.max(0, duration - 0.5) : seg.endMs / 1000;
      const targetSec = Math.min(seg.endMs / 1000, maxTime);
      videoRef.current.currentTime = targetSec;
      setCurrentTime(targetSec);
    } else if (duration > 1) {
      const targetSec = Math.max(0, duration - 1);
      videoRef.current.currentTime = targetSec;
      setCurrentTime(targetSec);
    }
  };

  // Auto-skip intro/recap if user enabled "Passer l'intro auto"
  useEffect(() => {
    if (
      autoSkipIntro &&
      activeSkipSegment &&
      (activeSkipSegment.type === "intro" || activeSkipSegment.type === "recap") &&
      activeSkipSegment.endMs
    ) {
      handleSkipSegment(activeSkipSegment);
    }
  }, [autoSkipIntro, activeSkipSegment]);

  // Next Episode countdown calculation (last 60s of episode or during end credits)
  const remainingSeconds = duration > 120 ? Math.max(0, Math.ceil(duration - currentTime)) : null;
  const isDuringEndCredits =
    activeSkipSegment?.type === "credits" &&
    (activeSkipSegment?.endMs === null ||
      (duration > 0 && activeSkipSegment.endMs / 1000 >= duration - 15));

  const showNextEpisodeCard =
    resolvedMeta.isTV &&
    Boolean(onNextEpisode) &&
    !dismissedNextBanner &&
    duration > 120 &&
    remainingSeconds !== null &&
    ((remainingSeconds <= 60 && remainingSeconds > 0) || isDuringEndCredits);

  const autoNextCountdown =
    remainingSeconds !== null ? Math.max(0, remainingSeconds - 20) : null;

  useEffect(() => {
    if (
      showNextEpisodeCard &&
      autoNext &&
      remainingSeconds !== null &&
      remainingSeconds <= 20 &&
      remainingSeconds > 0 &&
      !autoNextTriggeredRef.current
    ) {
      autoNextTriggeredRef.current = true;
      onNextEpisode?.();
    }
  }, [showNextEpisodeCard, autoNext, remainingSeconds, onNextEpisode]);

  const toggleAutoSkipIntro = () => {
    const nextVal = !autoSkipIntro;
    setAutoSkipIntro(nextVal);
    try {
      localStorage.setItem("erodium_auto_skip_intro", String(nextVal));
    } catch {}
  };

  // Expose video element to parent
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  // Synchroniser les sous-titres externes (.vtt) s'ils sont fournis
  useEffect(() => {
    if (Array.isArray(externalSubtitles) && externalSubtitles.length > 0) {
      setSubtitleTracks(
        externalSubtitles.map((s, idx) => ({
          id: idx,
          name: s.label || s.lang || `Sous-titre ${idx + 1}`,
          lang: s.lang || "fr",
          url: s.url,
        }))
      );
    }
  }, [externalSubtitles]);

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

    setIsBuffering(true);

    const baseOrigin = typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://erodium.vercel.app';

    const resolvedStreamUrl = (streamUrl.startsWith('/api/') || streamUrl.startsWith('file:///api/'))
      ? `${baseOrigin}${streamUrl.replace(/^file:\/\//, '')}`
      : streamUrl;

    if (Hls.isSupported() && (resolvedStreamUrl.includes(".m3u8") || resolvedStreamUrl.includes("/api/hls-proxy"))) {
      class ElectronHlsLoader extends Hls.DefaultConfig.loader {
        load(context, config, callbacks) {
          if (context.url && (context.url.includes('/api/hls-proxy') || context.url.startsWith('/api/') || context.url.startsWith('file:///api/'))) {
            const idx = context.url.indexOf('/api/');
            context.url = baseOrigin + context.url.slice(idx);
          }
          super.load(context, config, callbacks);
        }
      }

      const savedPos = resolvedMeta.tmdbId
        ? storage.getPlaybackPosition(
            resolvedMeta.tmdbId,
            resolvedMeta.isTV ? "tv" : "movie",
            resolvedMeta.season,
            resolvedMeta.episode
          )
        : null;
      const initialStartSec =
        savedPos?.currentTime && savedPos.currentTime >= 5 ? savedPos.currentTime : -1;

      const hls = new Hls({
        enableWorker: true,
        enableWebVTT: true,
        subtitleDisplay: true,
        // Continuous sliding-window buffer that fits within all browser MSE quotas
        maxBufferLength: 120,
        maxMaxBufferLength: 300,
        maxBufferSize: 120 * 1000 * 1000,
        backBufferLength: 20,
        startFragPrefetch: true,
        maxBufferHole: 0.3,
        highBufferWatchdogPeriod: 1,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 10,
        lowLatencyMode: false,
        // Prevent sudden ABR quality drops and resolution-switch stutters, and start directly in 1080p without a test fragment
        testBandwidth: false,
        capLevelToPlayerSize: false,
        abrEwmaDefaultEstimate: 25000000,
        abrBandWidthFactor: 0.98,
        abrBandWidthUpFactor: 0.5,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 800,
        startPosition: initialStartSec,
        pLoader: ElectronHlsLoader,
        fLoader: ElectronHlsLoader,
      });
      hlsRef.current = hls;

      hls.loadSource(resolvedStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        // Video Qualities
        const levels = data.levels.map((l, index) => ({
          index,
          height: l.height,
          bitrate: Math.round(l.bitrate / 1000),
        }));
        setQualityLevels(levels);

        // Lock to highest Full HD / HD quality (e.g. 1080p) without aborting the initial playlist fetch
        if (levels.length > 0) {
          let bestIdx = 0;
          for (let i = 1; i < levels.length; i++) {
            const cur = levels[i];
            const best = levels[bestIdx];
            if (
              (cur.height || 0) > (best.height || 0) ||
              ((cur.height || 0) === (best.height || 0) && (cur.bitrate || 0) > (best.bitrate || 0))
            ) {
              bestIdx = i;
            }
          }
          hls.loadLevel = bestIdx;
          setSelectedQuality(bestIdx);
        }

        // Subtitles
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          setSubtitleTracks([...hls.subtitleTracks]);
        }

        // Mark saved position as restored (startPosition in Hls config already seeks cleanly)
        if (initialStartSec >= 5 && !hasRestoredPositionRef.current) {
          hasRestoredPositionRef.current = true;
          setCurrentTime(initialStartSec);
          setResumedFromTime(initialStartSec);
        }

        // Attempt playback
        video.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false);
        if (video && video.buffered && video.buffered.length > 0) {
          const cur = video.currentTime || 0;
          let end = 0;
          for (let i = 0; i < video.buffered.length; i++) {
            const bStart = video.buffered.start(i);
            const bEnd = video.buffered.end(i);
            if (bStart <= cur + 2 && bEnd >= cur) {
              end = Math.max(end, bEnd);
            }
          }
          if (!end) {
            end = video.buffered.end(video.buffered.length - 1);
          }
          setBufferedEnd(end);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          setAudioTracks([...hls.audioTracks]);
          if (!hasAutoSelectedAudioRef.current) {
            hasAutoSelectedAudioRef.current = true;
            const langTarget = preferredLanguage === "vostfr" ? "en" : "fr";
            let matchIdx = hls.audioTracks.findIndex(
              (t) =>
                t.lang?.toLowerCase().startsWith(langTarget) ||
                t.name?.toLowerCase().includes(langTarget === "fr" ? "french" : "english") ||
                t.name?.toLowerCase().includes(langTarget === "fr" ? "français" : "anglais")
            );
            // Si on cherche du français et qu'il n'y a pas de code 'fr', tester 'fre'/'fra'
            if (matchIdx < 0 && langTarget === "fr") {
              matchIdx = hls.audioTracks.findIndex((t) => t.lang === "fra" || t.lang === "fre");
            }
            if (matchIdx >= 0 && matchIdx !== hls.audioTrack) {
              hls.audioTrack = matchIdx;
              setSelectedAudio(matchIdx);
            } else if (hls.audioTrack >= 0) {
              setSelectedAudio(hls.audioTrack);
            }
          }
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setSelectedAudio(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          setSubtitleTracks([...hls.subtitleTracks]);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setSelectedSubtitle(data.id);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.autoLevelEnabled) {
          setSelectedQuality(-1);
        } else {
          setSelectedQuality(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Ignorer les erreurs de parsing de sous-titres externes (.vtt) pour ne jamais couper la vidéo
        if (
          data.details === Hls.ErrorDetails.LEVEL_PARSING_ERROR &&
          (data.url?.includes(".vtt") || data.context?.type === "subtitleTrack")
        ) {
          return;
        }

        // Auto-recover from non-fatal buffer stalls, gap stalls, or buffer full
        if (
          !data.fatal &&
          (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL)
        ) {
          try {
            hls.startLoad();
          } catch {}

          if (video && !video.paused) {
            const cur = video.currentTime;
            let jumped = false;
            if (video.buffered && video.buffered.length > 0) {
              for (let i = 0; i < video.buffered.length; i++) {
                const start = video.buffered.start(i);
                const end = video.buffered.end(i);
                // Jump over a small gap (< 3s) to the next buffered range
                if (start > cur && start - cur < 3 && end > start + 0.1) {
                  try {
                    video.currentTime = start + 0.05;
                    jumped = true;
                  } catch {}
                  break;
                }
              }
            }
            if (!jumped) {
              // Micro-nudge forward to unfreeze decoder on timestamp hole
              try {
                video.currentTime = cur + 0.1;
              } catch {}
            }
          }
          return;
        }

        if (!data.fatal && data.details === Hls.ErrorDetails.BUFFER_FULL_ERROR) {
          try {
            const cur = video ? video.currentTime : 0;
            if (cur > 25) {
              hls.trigger(Hls.Events.BUFFER_FLUSHING, { startOffset: 0, endOffset: cur - 15, type: 'video' });
            }
          } catch {}
          return;
        }

        if (data.fatal) {
          console.warn("HLS fatal error:", data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR: {
              const now = Date.now();
              if (now - lastMediaRecoverRef.current > 3000) {
                lastMediaRecoverRef.current = now;
                hls.recoverMediaError();
              } else {
                hls.swapAudioCodec();
                hls.recoverMediaError();
              }
              break;
            }
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (video && resolvedMeta.tmdbId && video.currentTime > 3) {
          storage.savePlaybackPosition(
            resolvedMeta.tmdbId,
            resolvedMeta.isTV ? "tv" : "movie",
            resolvedMeta.season,
            resolvedMeta.episode,
            video.currentTime,
            video.duration || 0
          );
        }
        hls.destroy();
        if (hlsRef.current === hls) {
          hlsRef.current = null;
        }
      };
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = streamUrl;
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [streamUrl, preferredLanguage, resolvedMeta.tmdbId, resolvedMeta.isTV, resolvedMeta.season, resolvedMeta.episode]);

  // Auto-hide "Reprise à XX:XX" pill after 6 seconds
  useEffect(() => {
    if (!resumedFromTime) return;
    const t = setTimeout(() => setResumedFromTime(null), 6500);
    return () => clearTimeout(t);
  }, [resumedFromTime]);

  // Active Anti-Stall Watchdog: automatically unfreezes the stream if video stops progressing
  useEffect(() => {
    let lastTime = 0;
    let stallCount = 0;

    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended || v.seeking) {
        stallCount = 0;
        return;
      }

      const cur = v.currentTime;
      // If time hasn't advanced for > 1s while in playing state
      if (Math.abs(cur - lastTime) < 0.15 && cur > 0) {
        stallCount++;

        // Step 1: Force HLS loader to wake up and fetch fragments
        if (hlsRef.current) {
          try {
            hlsRef.current.startLoad();
          } catch {}
        }

        // Step 2: If stalled for >= 2 checks (2s), auto-nudge over micro-gap or decoder freeze
        if (stallCount >= 2) {
          let jumped = false;
          if (v.buffered && v.buffered.length > 0) {
            for (let i = 0; i < v.buffered.length; i++) {
              const start = v.buffered.start(i);
              const end = v.buffered.end(i);
              if (start > cur && start - cur < 2.5 && end > start + 0.1) {
                try {
                  v.currentTime = start + 0.05;
                  jumped = true;
                } catch {}
                break;
              }
            }
          }
          if (!jumped) {
            try {
              // Micro-nudge of 0.1s to release the decoder lock
              v.currentTime = cur + 0.1;
            } catch {}
          }
        }

        // Step 3: If still stalled after 5s, attempt a media error recovery
        if (stallCount >= 5 && hlsRef.current) {
          try {
            hlsRef.current.recoverMediaError();
          } catch {}
        }
      } else {
        lastTime = cur;
        stallCount = 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Persist position on page unload / tab close
  useEffect(() => {
    const saveNow = () => {
      const v = videoRef.current;
      if (v && resolvedMeta.tmdbId && v.currentTime > 3) {
        storage.savePlaybackPosition(
          resolvedMeta.tmdbId,
          resolvedMeta.isTV ? "tv" : "movie",
          resolvedMeta.season,
          resolvedMeta.episode,
          v.currentTime,
          v.duration || 0
        );
      }
    };
    window.addEventListener("beforeunload", saveNow);
    return () => {
      saveNow();
      window.removeEventListener("beforeunload", saveNow);
    };
  }, [resolvedMeta.tmdbId, resolvedMeta.isTV, resolvedMeta.season, resolvedMeta.episode]);

  // Video Events
  const persistCurrentPosition = (force = false) => {
    const v = videoRef.current;
    if (!v || !resolvedMeta.tmdbId || v.currentTime < 3) return;
    const now = Date.now();
    if (!force && now - lastSavedWallTimeRef.current < 2500) return;
    lastSavedWallTimeRef.current = now;
    storage.savePlaybackPosition(
      resolvedMeta.tmdbId,
      resolvedMeta.isTV ? "tv" : "movie",
      resolvedMeta.season,
      resolvedMeta.episode,
      v.currentTime,
      v.duration || 0
    );
  };

  const updateBufferedProgress = () => {
    const v = videoRef.current;
    if (!v || !v.buffered || v.buffered.length === 0) return;
    const cur = v.currentTime || 0;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      const bStart = v.buffered.start(i);
      const bEnd = v.buffered.end(i);
      if (bStart <= cur + 2 && bEnd >= cur) {
        end = Math.max(end, bEnd);
      }
    }
    if (!end) {
      end = v.buffered.end(v.buffered.length - 1);
    }
    setBufferedEnd(end);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    // Only seek manually in loadedmetadata for native <video> streams (HLS.js uses startPosition)
    if (!hlsRef.current && !hasRestoredPositionRef.current && resolvedMeta.tmdbId) {
      const savedPos = storage.getPlaybackPosition(
        resolvedMeta.tmdbId,
        resolvedMeta.isTV ? "tv" : "movie",
        resolvedMeta.season,
        resolvedMeta.episode
      );
      if (savedPos?.currentTime >= 5 && (!v.duration || savedPos.currentTime < v.duration - 25)) {
        hasRestoredPositionRef.current = true;
        try {
          v.currentTime = savedPos.currentTime;
          setCurrentTime(savedPos.currentTime);
          setResumedFromTime(savedPos.currentTime);
        } catch {}
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
      if (videoRef.current.currentTime > 0 && !videoRef.current.paused) {
        setIsBuffering(false);
      }
      updateBufferedProgress();
      persistCurrentPosition(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        // Keep HLS downloading segments in the background even while paused
        if (hlsRef.current) {
          try {
            hlsRef.current.startLoad();
          } catch {}
        }
        persistCurrentPosition(true);
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
      persistCurrentPosition(true);
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
    setSelectedSubtitle(subIndex);
    setShowSettings(false);
    setActiveTab("menu");

    if (hlsRef.current && hlsRef.current.subtitleTracks?.length > 0) {
      hlsRef.current.subtitleTrack = subIndex;
      hlsRef.current.subtitleDisplay = subIndex >= 0;
    }
    if (videoRef.current?.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = i === subIndex ? "showing" : "disabled";
      }
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
        crossOrigin="anonymous"
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onProgress={updateBufferedProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (hlsRef.current) {
            try {
              hlsRef.current.startLoad();
            } catch {}
          }
          persistCurrentPosition(true);
        }}
        onWaiting={() => {
          setIsBuffering(true);
          if (hlsRef.current) {
            try {
              hlsRef.current.startLoad();
            } catch {}
          }
        }}
        onStalled={() => {
          setIsBuffering(true);
          if (hlsRef.current) {
            try {
              hlsRef.current.startLoad();
            } catch {}
          }
        }}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onCanPlay={() => setIsBuffering(false)}
        onLoadedData={() => { setIsBuffering(false); handleTimeUpdate(); }}
        onEnded={() => {
          if (resolvedMeta.tmdbId) {
            storage.clearPlaybackPosition(
              resolvedMeta.tmdbId,
              resolvedMeta.isTV ? "tv" : "movie",
              resolvedMeta.season,
              resolvedMeta.episode
            );
          }
          onEnded?.();
        }}
        onClick={togglePlay}
        playsInline
        style={videoFilter ? { filter: videoFilter } : undefined}
        className="w-full h-full object-contain cursor-pointer transition-[filter] duration-300"
      >
        {Array.isArray(externalSubtitles) &&
          externalSubtitles.map((sub, idx) => (
            <track
              key={sub.url || idx}
              kind="subtitles"
              src={sub.url}
              srcLang={sub.lang || "fr"}
              label={sub.label || sub.lang || `Sous-titre ${idx + 1}`}
            />
          ))}
      </video>

      {/* Buffering Spinner */}
      {isBuffering && isPlaying && (
        <div className="absolute z-20 pointer-events-none flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
          <span className="text-xs text-white/90 font-bold drop-shadow px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            Chargement HD...
          </span>
        </div>
      )}

      {/* Floating Center Play Button when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 p-5 sm:p-6 rounded-full bg-erodium-gradient glow-erodium text-white shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20 cursor-pointer"
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-0.5" />
        </button>
      )}

      {/* Floating Badge (Top Left) + Quality & Buffer Status + Resume Notification */}
      <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-erodium-gradient text-white font-black text-[10px] tracking-wider uppercase backdrop-blur-md shadow-lg flex items-center gap-1.5 border border-white/20 pointer-events-none">
          <Sparkles className="w-3 h-3 text-amber-200" />
          <span>Erodium • 0 Pub</span>
        </span>
        {qualityLevels.length > 0 && (
          <span className="px-2 py-1 rounded-lg bg-zinc-900/85 text-amber-300 font-extrabold text-[10px] tracking-wide backdrop-blur-md border border-amber-500/30 pointer-events-none">
            {selectedQuality >= 0 && qualityLevels[selectedQuality]?.height
              ? `${qualityLevels[selectedQuality].height}p HD`
              : "Auto HD"}
          </span>
        )}
        {isTV && (
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/85 text-zinc-200 font-bold text-[10px] tracking-wide backdrop-blur-md border border-white/10 pointer-events-none">
            S{season} • Ép. {episode}
          </span>
        )}
        {bufferedEnd - currentTime >= 5 && (showControls || !isPlaying) && (
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/85 text-emerald-300 font-bold text-[10px] tracking-wide backdrop-blur-md border border-emerald-500/25 flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>+{formatTime(Math.max(0, bufferedEnd - currentTime))} préchargé</span>
          </span>
        )}
        {resumedFromTime !== null && resumedFromTime >= 5 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950/90 border border-orange-500/40 text-xs text-white backdrop-blur-md shadow-xl animate-fade-in">
            <span className="text-zinc-300">
              Reprise à <strong className="text-orange-400">{formatTime(resumedFromTime)}</strong>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
                setResumedFromTime(null);
              }}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-orange-300 hover:text-white transition-colors cursor-pointer"
            >
              Recommencer
            </button>
          </div>
        )}
      </div>

      {/* Floating Skip Intro / Recap / Générique (Outro) Button */}
      {activeSkipSegment && !showNextEpisodeCard && (
        <div
          className={`absolute right-4 sm:right-6 z-30 flex items-center gap-1.5 transition-all duration-300 animate-fade-in ${
            showControls || !isPlaying ? "bottom-20 sm:bottom-24" : "bottom-6 sm:bottom-8"
          }`}
        >
          <button
            onClick={() => handleSkipSegment(activeSkipSegment)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-orange-500 text-zinc-950 hover:text-white font-extrabold text-xs sm:text-sm shadow-2xl border border-white/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>{SKIP_LABELS[activeSkipSegment.type] || "Passer"}</span>
          </button>
          <button
            onClick={() => setDismissedSegmentKey(activeSkipSegment.key)}
            title="Fermer"
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Next Episode Card (End of Episode / Credits) */}
      {showNextEpisodeCard && (
        <div
          className={`absolute right-4 sm:right-6 z-30 w-72 sm:w-80 p-3.5 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-orange-500/40 shadow-2xl transition-all duration-300 animate-fade-in ${
            showControls || !isPlaying ? "bottom-20 sm:bottom-24" : "bottom-6 sm:bottom-8"
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                Épisode suivant
              </p>
              <p className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-0.5">
                {nextEpisodeLabel || `Saison ${season} • Épisode ${Number(episode) + 1}`}
              </p>
            </div>
            <button
              onClick={() => setDismissedNextBanner(true)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Masquer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {autoNext && autoNextCountdown !== null && autoNextCountdown > 0 && (
            <p className="text-[11px] text-zinc-400 mb-2.5">
              Passage automatique dans{" "}
              <span className="text-orange-400 font-bold">{autoNextCountdown} s</span>
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                autoNextTriggeredRef.current = true;
                onNextEpisode?.();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 fill-white" />
              <span>Lire maintenant</span>
            </button>
            <button
              onClick={() => setDismissedNextBanner(true)}
              className="py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Rester
            </button>
          </div>
        </div>
      )}

      {/* Custom Video Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 flex flex-col gap-2 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar (Seekbar) with Live Buffered Preload Bar & Intro/Credits Markers */}
        <div className="relative flex items-center w-full h-3 group/seek">
          {/* Base Track */}
          <div className="absolute inset-x-0 h-1.5 group-hover/seek:h-2.5 bg-zinc-800/90 rounded-full overflow-hidden transition-all pointer-events-none">
            {/* Buffered (Preloaded) Bar */}
            {duration > 0 && bufferedEnd > 0 && (
              <div
                style={{ width: `${Math.min(100, (bufferedEnd / duration) * 100)}%` }}
                className="absolute inset-y-0 left-0 bg-white/30 transition-[width] duration-300 rounded-full"
              />
            )}
            {/* Played Bar */}
            {duration > 0 && (
              <div
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-amber-500 to-fuchsia-500 rounded-full"
              />
            )}
          </div>

          {duration > 0 &&
            effectiveSegments.map((seg, idx) => {
              const startSec = Math.max(0, (seg.startMs ?? 0) / 1000);
              const endSec = seg.endMs ? Math.min(duration, seg.endMs / 1000) : duration;
              if (endSec <= startSec || startSec >= duration) return null;
              const leftPct = (startSec / duration) * 100;
              const widthPct = Math.max(0.8, ((endSec - startSec) / duration) * 100);
              return (
                <div
                  key={`${seg.type}_${idx}`}
                  title={SKIP_LABELS[seg.type] || seg.type}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className="absolute h-1.5 group-hover/seek:h-2.5 rounded-full bg-amber-300/85 pointer-events-none z-10 transition-all"
                />
              );
            })}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="relative z-20 w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Previous Episode (TV) */}
            {isTV && onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                title="Épisode précédent"
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            {/* Next Episode (TV) */}
            {isTV && onNextEpisode && (
              <button
                onClick={onNextEpisode}
                title={nextEpisodeLabel ? `Suivant : ${nextEpisodeLabel}` : "Épisode suivant"}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

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

          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Inline Skip Button in Control Bar when a segment is active */}
            {activeSkipSegment && (
              <button
                onClick={() => handleSkipSegment(activeSkipSegment)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-600/90 hover:bg-orange-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{SKIP_LABELS[activeSkipSegment.type] || "Passer"}</span>
              </button>
            )}

            {/* Episodes List Drawer Trigger (TV) */}
            {isTV && onOpenEpisodes && (
              <button
                onClick={onOpenEpisodes}
                title="Liste des épisodes"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-semibold"
              >
                <ListVideo className="w-4 h-4 text-orange-400" />
                <span className="hidden md:inline">Épisodes</span>
              </button>
            )}

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
                <div className="absolute bottom-11 right-0 w-64 p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl text-xs space-y-2.5 z-40 animate-fade-in">
                  {/* MAIN MENU */}
                  {activeTab === "menu" && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <span className="font-bold text-white text-xs">Paramètres du Lecteur</span>
                      </div>

                      {/* Auto-skip Intro toggle */}
                      <button
                        onClick={toggleAutoSkipIntro}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <FastForward className="w-4 h-4 text-orange-400" />
                          <span>Passer l'intro auto</span>
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            autoSkipIntro ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        >
                          {autoSkipIntro ? "Activé" : "Désactivé"}
                        </span>
                      </button>

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
                          const langCode = (track.lang || "").toLowerCase();
                          const trackName = (track.name || "").toLowerCase();
                          const isFr = langCode.startsWith("fr") || trackName.includes("french") || trackName.includes("français");
                          const isEn = langCode.startsWith("en") || trackName.includes("english") || trackName.includes("anglais");
                          const isJa = langCode.startsWith("ja") || trackName.includes("japan") || trackName.includes("japonais");
                          const label = isFr
                            ? "🇫🇷 Français 5.1"
                            : isEn
                            ? "🇬🇧 Anglais 5.1"
                            : isJa
                            ? "🇯🇵 Japonais (VO)"
                            : track.lang === "und"
                            ? `Piste ${idx + 1}`
                            : (track.name || `Piste ${idx + 1}`);
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

