// Service de présence et compteur de spectateurs 100% RÉEL pour NovaStream
// Fonctionne en mode Hybride :
// 1. Local / Multi-onglets / Réseau (via BroadcastChannel) : compte exactement les onglets et fenêtres actifs sans triche.
// 2. Cloud Mondial (via Supabase Realtime) : synchronise en direct tous les utilisateurs connectés dans le monde entier.

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Identifiant unique pour cet onglet / session
const TAB_ID =
  "tab_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();

// Registre des pairs actifs { [tabId]: { lastSeen: number, watchingMediaId: string|number|null } }
const localPeers = new Map();
localPeers.set(TAB_ID, { lastSeen: Date.now(), watchingMediaId: null });

let broadcastChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel("novastream_real_presence");
  }
} catch (e) {
  console.warn("BroadcastChannel non supporté:", e);
}

// État global partagé
let listeners = new Set();
let currentWatchingMediaId = null;
let supabaseChannel = null;
let cloudUserCount = null;
let cloudMediaCounts = new Map();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// Nettoyer les onglets fermés ou inactifs (> 8s sans heartbeat)
function pruneDeadPeers() {
  const now = Date.now();
  let changed = false;
  localPeers.forEach((data, id) => {
    if (id !== TAB_ID && now - data.lastSeen > 8000) {
      localPeers.delete(id);
      changed = true;
    }
  });
  if (changed) notifyListeners();
}

// Gestion des messages BroadcastChannel
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const data = event.data;
    if (!data || !data.tabId) return;

    if (data.type === "ping" || data.type === "join") {
      localPeers.set(data.tabId, {
        lastSeen: Date.now(),
        watchingMediaId: data.watchingMediaId ?? null,
      });
      // Répondre avec un pong pour confirmer notre présence
      if (data.type === "join") {
        broadcastChannel.postMessage({
          type: "pong",
          tabId: TAB_ID,
          watchingMediaId: currentWatchingMediaId,
        });
      }
      notifyListeners();
    } else if (data.type === "pong") {
      localPeers.set(data.tabId, {
        lastSeen: Date.now(),
        watchingMediaId: data.watchingMediaId ?? null,
      });
      notifyListeners();
    } else if (data.type === "leave") {
      localPeers.delete(data.tabId);
      notifyListeners();
    } else if (data.type === "watch") {
      const peer = localPeers.get(data.tabId) || { lastSeen: Date.now() };
      peer.watchingMediaId = data.mediaId;
      peer.lastSeen = Date.now();
      localPeers.set(data.tabId, peer);
      notifyListeners();
    }
  };

  // Annoncer notre arrivée aux autres onglets
  broadcastChannel.postMessage({
    type: "join",
    tabId: TAB_ID,
    watchingMediaId: currentWatchingMediaId,
  });

  // Heartbeat régulier toutes les 3 secondes
  setInterval(() => {
    const self = localPeers.get(TAB_ID);
    if (self) self.lastSeen = Date.now();
    broadcastChannel.postMessage({
      type: "ping",
      tabId: TAB_ID,
      watchingMediaId: currentWatchingMediaId,
    });
    pruneDeadPeers();
  }, 3000);

  // Annoncer notre départ lors de la fermeture de l'onglet
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      broadcastChannel.postMessage({
        type: "leave",
        tabId: TAB_ID,
      });
    });
  }
}

// Initialisation du client Supabase Realtime si configuré
function initSupabaseRealtime() {
  const supabaseUrl = (localStorage.getItem("novastream_supabase_url") || "").trim();
  const supabaseKey = (localStorage.getItem("novastream_supabase_anon_key") || "").trim();

  if (!supabaseUrl || !supabaseKey) {
    cloudUserCount = null;
    cloudMediaCounts.clear();
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    supabaseChannel = supabase.channel("novastream_presence_cloud", {
      config: {
        presence: {
          key: TAB_ID,
        },
      },
    });

    supabaseChannel
      .on("presence", { event: "sync" }, () => {
        const state = supabaseChannel.presenceState();
        const users = Object.keys(state);
        cloudUserCount = Math.max(1, users.length);

        // Compter les personnes par média
        const newMediaCounts = new Map();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.watchingMediaId) {
              const count = newMediaCounts.get(p.watchingMediaId) || 0;
              newMediaCounts.set(p.watchingMediaId, count + 1);
            }
          });
        });
        cloudMediaCounts = newMediaCounts;
        notifyListeners();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await supabaseChannel.track({
            tabId: TAB_ID,
            watchingMediaId: currentWatchingMediaId,
            online_at: new Date().toISOString(),
          });
        }
      });
  } catch (err) {
    console.warn("Erreur connexion Supabase Realtime:", err);
  }
}

// Démarrer Supabase si configuré
initSupabaseRealtime();

export const liveCounter = {
  // Met à jour le média actuellement regardé par cet onglet
  setWatchingMedia: (mediaId) => {
    currentWatchingMediaId = mediaId;
    const self = localPeers.get(TAB_ID);
    if (self) self.watchingMediaId = mediaId;

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: "watch",
        tabId: TAB_ID,
        mediaId,
      });
    }

    if (supabaseChannel) {
      supabaseChannel.track({
        tabId: TAB_ID,
        watchingMediaId: mediaId,
        online_at: new Date().toISOString(),
      }).catch(() => {});
    }

    notifyListeners();
  },

  // Obtient le nombre total de personnes connectées (100% réel)
  getGlobalCount: () => {
    if (cloudUserCount !== null) {
      return cloudUserCount;
    }
    pruneDeadPeers();
    return Math.max(1, localPeers.size);
  },

  // Obtient le nombre de personnes regardant un média particulier (100% réel)
  getMediaCount: (mediaId) => {
    if (!mediaId) return 0;
    const target = String(mediaId);

    if (cloudUserCount !== null) {
      return cloudMediaCounts.get(target) || cloudMediaCounts.get(Number(mediaId)) || 0;
    }

    pruneDeadPeers();
    let count = 0;
    localPeers.forEach((data) => {
      if (data.watchingMediaId && String(data.watchingMediaId) === target) {
        count++;
      }
    });
    return count;
  },

  // Vérifie si le mode Cloud Supabase est actif
  isCloudActive: () => {
    return Boolean(
      (localStorage.getItem("novastream_supabase_url") || "").trim() &&
        (localStorage.getItem("novastream_supabase_anon_key") || "").trim()
    );
  },

  // Reconnecte ou réinitialise Supabase lors d'un changement de paramètres
  reconnectCloud: () => {
    if (supabaseChannel) {
      try {
        supabaseChannel.unsubscribe();
      } catch {}
      supabaseChannel = null;
    }
    initSupabaseRealtime();
    notifyListeners();
  },
};

/**
 * Hook React pour afficher le nombre d'utilisateurs connectés en direct (100% réel)
 */
export function useLiveViewers() {
  const [count, setCount] = useState(() => liveCounter.getGlobalCount());

  useEffect(() => {
    const update = () => setCount(liveCounter.getGlobalCount());
    listeners.add(update);
    update();

    return () => {
      listeners.delete(update);
    };
  }, []);

  return count;
}

/**
 * Hook React pour afficher le nombre de spectateurs regardant un média (100% réel)
 */
export function useMediaLiveViewers(mediaId) {
  const [count, setCount] = useState(() => liveCounter.getMediaCount(mediaId));

  useEffect(() => {
    const update = () => setCount(liveCounter.getMediaCount(mediaId));
    listeners.add(update);
    update();

    return () => {
      listeners.delete(update);
    };
  }, [mediaId]);

  return count;
}
