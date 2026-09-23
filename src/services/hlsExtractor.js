// Service d'extraction et de débridage de flux direct haute fidélité (Real-Debrid / AllDebrid / Torrentio)
// Permet de lire des flux sans aucune iframe, sans popups et sans publicités.

import { tmdbApi } from "../api/tmdb";

export const hlsExtractor = {
  // Résout un flux direct pour un film ou une série
  resolveDirectStream: async (media, season = 1, episode = 1) => {
    try {
      const token = (localStorage.getItem("novastream_debrid_token") || "").trim();
      
      // 1. Vérifier si un token Debrid est configuré
      if (!token) {
        return {
          success: false,
          reason: "no_token",
          message: "Aucune clé Real-Debrid configurée dans les Paramètres.",
        };
      }

      // 2. Déterminer le type de média
      const mediaType = media.media_type || (media.title ? "movie" : "tv");
      const title = media.title || media.name || "Titre inconnu";

      // 4. Obtenir l'identifiant IMDb via TMDB
      let imdbId = media.imdb_id;
      if (!imdbId && media.id) {
        try {
          const extIds = await tmdbApi.getExternalIds(mediaType, media.id);
          imdbId = extIds?.imdb_id;
        } catch (e) {
          console.warn("Impossible de récupérer l'IMDb ID:", e);
        }
      }

      if (!imdbId) {
        return {
          success: false,
          reason: "no_imdb_id",
          title,
          message: `Identifiant international introuvable pour « ${title} ».`,
        };
      }

      // 5. Interroger le résolveur Real-Debrid (via Torrentio RD)
      const queryId =
        mediaType === "movie" ? imdbId : `${imdbId}:${season}:${episode}`;
      const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${encodeURIComponent(
        token
      )}/stream/${mediaType}/${queryId}.json`;

      const res = await fetch(torrentioUrl);
      if (!res.ok) {
        throw new Error(`Erreur réseau résolveur (${res.status})`);
      }

      const data = await res.json();
      const streams = data.streams || [];

      // 6. Vérifier les erreurs spécifiques Real-Debrid (Compte expiré ou mauvaise clé)
      const errorStream = streams.find(
        (s) =>
          s.name?.includes("RD error") ||
          s.url?.includes("failed_access") ||
          s.title?.toLowerCase().includes("invalid") ||
          s.title?.toLowerCase().includes("expired")
      );

      if (errorStream) {
        return {
          success: false,
          reason: "debrid_error",
          title,
          message: errorStream.title || "Votre compte Real-Debrid est expiré ou la clé API est invalide.",
        };
      }

      // 7. Filtrer les flux vidéo valides
      const validStreams = streams.filter(
        (s) => s.url && !s.url.includes("failed_access")
      );

      if (validStreams.length === 0) {
        return {
          success: false,
          reason: "no_streams",
          title,
          message: `Aucun flux débridé trouvé pour « ${title} » (${mediaType === "tv" ? `S${season}E${episode}` : "Film"}).`,
        };
      }

      // 8. Enrichir chaque flux avec des métadonnées intelligentes
      const enrichedStreams = validStreams.map((s, idx) => {
        const fullText = `${s.name || ""} ${s.title || ""}`.toLowerCase();
        const isCached = s.name?.includes("[RD+]") || !s.name?.includes("download");
        const isFrench = /french|truefrench|vff|vfq|\bvf\b|multi|français|🇫🇷/i.test(fullText);
        const isVostfr = /vostfr|subfrench/i.test(fullText);
        const is4K = /4k|2160p|uhd/i.test(fullText);
        const is1080p = /1080p|fhd/i.test(fullText);
        const is720p = /720p|hd/i.test(fullText);
        
        // Détection Audio-Description & Pistes Secondaires (VF2 / VFQ)
        const isAudioDescription =
          /audiodescription|audio-description|audio\.description|\b(ad|dvs)\b/i.test(
            fullText
          );
        const isVF2 = /\b(vf2|vfq|multi\.ca|ca\.hdr|ca\.720p)\b/i.test(fullText);

        // Détection Audio (AAC/MP3 = 100% compatible navigateur)
        const hasAac = /aac|mp3|opus/i.test(fullText);
        const hasDts = /dts|truehd/i.test(fullText);
        const hasEac3 = /eac3|ddp|dd\+|dolby/i.test(fullText);
        
        // Taille
        const sizeMatch = s.title?.match(/💾\s*([\d\.]+\s*[GM]B)/i);
        const size = sizeMatch ? sizeMatch[1] : "";
        
        // Titre propre du fichier
        const firstLine = (s.title || "").split("\n")[0] || `Source #${idx + 1}`;

        return {
          ...s,
          streamIndex: idx,
          isCached,
          isFrench,
          isVostfr,
          is4K,
          is1080p,
          is720p,
          isAudioDescription,
          isVF2,
          hasAac,
          hasDts,
          hasEac3,
          size,
          filename: firstLine,
        };
      });

      // Tri intelligent haute précision :
      // 1. Éliminer l'Audio-Description (-2500) et VF2 (-1200)
      // 2. Priorité absolue : Français standard non-AD (+1800)
      // 3. Audio AAC / MP3 garanti navigateur (+1200) (évite le bug du son muet DTS/EAC3)
      // 4. Synergie parfaite VF + Son AAC (+1000)
      // 5. En cache [RD+] (+500)
      // 6. Pénalité DTS / EAC3 si seul format audio (-600)
      // 7. Qualité (1080p / 4K)
      const sorted = [...enrichedStreams].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Pénaliser massivement l'Audio-Description et VF2 (AD/doublages alternatifs)
        if (a.isAudioDescription) scoreA -= 2500;
        if (b.isAudioDescription) scoreB -= 2500;

        if (a.isVF2) scoreA -= 1200;
        if (b.isVF2) scoreB -= 1200;

        // En Cache [RD+]
        if (a.isCached) scoreA += 500;
        if (b.isCached) scoreB += 500;

        // VF Standard (VFF, TRUEFRENCH, Multi FR)
        if (a.isFrench && !a.isAudioDescription && !a.isVF2) scoreA += 1800;
        if (b.isFrench && !b.isAudioDescription && !b.isVF2) scoreB += 1800;

        // Audio compatible navigateur garanti (AAC / MP3 / Opus)
        if (a.hasAac) scoreA += 1200;
        if (b.hasAac) scoreB += 1200;

        // Synergie parfaite : VF + Son AAC garanti sans bug
        if (a.isFrench && a.hasAac && !a.isAudioDescription) scoreA += 1000;
        if (b.isFrench && b.hasAac && !b.isAudioDescription) scoreB += 1000;

        // Pénalité DTS / EAC3 sans AAC (risque élevé de vidéo muette dans le navigateur)
        if (a.hasDts && !a.hasAac) scoreA -= 600;
        if (b.hasDts && !b.hasAac) scoreB -= 600;

        // Si aucun flux VF n'existe, favoriser la VOSTFR avec son AAC
        if (a.isVostfr) scoreA += 600;
        if (b.isVostfr) scoreB += 600;

        // Qualité vidéo
        if (a.is1080p) scoreA += 120;
        if (b.is1080p) scoreB += 120;
        if (a.is4K) scoreA += 80;
        if (b.is4K) scoreB += 80;

        return scoreB - scoreA;
      });

      const bestStream = sorted[0];

      return {
        success: true,
        url: bestStream.url,
        title: bestStream.title,
        streams: sorted,
        type: "realdebrid",
      };
    } catch (err) {
      console.error("Erreur débridage direct:", err);
      return {
        success: false,
        reason: "network_error",
        message: "Erreur de connexion au service de débridage.",
      };
    }
  },
};
