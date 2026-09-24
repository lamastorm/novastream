import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HeroBanner from "./components/HeroBanner";
import MediaRow from "./components/MediaRow";
import MediaCard from "./components/MediaCard";
import Top10Row from "./components/Top10Row";
import PlatformFilter, { PLATFORMS } from "./components/PlatformFilter";
import AlphabetBar from "./components/AlphabetBar";
import DetailModal from "./components/DetailModal";
import PlayerModal from "./components/PlayerModal";
import SettingsModal from "./components/SettingsModal";
import BottomNav from "./components/BottomNav";
import { tmdbApi } from "./api/tmdb";
import { catalogProvider } from "./services/catalogProvider";
import { anilistApi } from "./api/anilist";
import { jikanApi } from "./api/jikan";
import { tvmazeApi } from "./api/tvmaze";
import { traktApi, traktLists } from "./api/trakt";
import { storage } from "./services/storage";
import { languageAdvisor } from "./services/languageAdvisor";
import { deviceAdvisor } from "./services/deviceAdvisor";
import { gamepadService } from "./services/gamepadService";
import MoodSelector from "./components/MoodSelector";
import LiveCatalogStats from "./components/LiveCatalogStats";
import DonateModal from "./components/DonateModal";
import VpnBanner from "./components/VpnBanner";
import SearchOverlay from "./components/SearchOverlay";
import {
  Film,
  Tv,
  Play,
  Bookmark,
  Sparkles,
  Flame,
  Loader2,
  Dice5,
  Calendar,
  Layers,
  Compass,
  Star,
  CheckCircle2,
  Clock,
  Filter,
  Heart,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("home"); // home, movies, series, anime, favorites
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCategory, setSearchCategory] = useState("all"); // "all" | "movie" | "tv" | "anime"
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);

  // External APIs State
  const [tvmazeSchedule, setTvmazeSchedule] = useState([]);
  const [animeSource, setAnimeSource] = useState("anilist_trending"); // anilist_trending, anilist_season, mal_top, tmdb_all
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [selectedTraktList, setSelectedTraktList] = useState(traktLists[0].id);
  const [traktItems, setTraktItems] = useState([]);
  const [traktLoading, setTraktLoading] = useState(false);
  const [traktHomeFeatured, setTraktHomeFeatured] = useState([]);

  // Home data
  const [heroItem, setHeroItem] = useState(null);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [airingTodayTV, setAiringTodayTV] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [recentAnime, setRecentAnime] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [animeMovies, setAnimeMovies] = useState([]);
  const [animeShonen, setAnimeShonen] = useState([]);
  const [animeIsekai, setAnimeIsekai] = useState([]);
  const [loadingHome, setLoadingHome] = useState(true);

  // Mood filter (Que regarder ce soir ?)
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodResults, setMoodResults] = useState([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Filters
  const [tabItems, setTabItems] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSort, setSelectedSort] = useState("popularity.desc");
  const [selectedMinRating, setSelectedMinRating] = useState(null); // min rating filter

  // Watchlist category tab: 'all' | 'plan_to_watch' | 'watching' | 'completed'
  const [watchlistCategory, setWatchlistCategory] = useState("all");

  // Modals & Player state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null); // { media, season, episode }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // Watchlist & History
  const [favorites, setFavorites] = useState(storage.getWatchlist());
  const [history, setHistory] = useState(storage.getHistory());

  // Fast O(1) favorite lookup set to prevent expensive array iterations on 175+ cards
  const favoriteSet = React.useMemo(() => {
    return new Set(
      favorites.map((f) => `${f.id}-${f.media_type || (f.title ? "movie" : "tv")}`)
    );
  }, [favorites]);

  const isItemFavorite = React.useCallback(
    (item) => {
      const type = item.media_type || (item.title ? "movie" : "tv");
      return favoriteSet.has(`${item.id}-${type}`);
    },
    [favoriteSet]
  );

  // Initialize TV Mode & Gamepad Navigation (Xbox, PlayStation, TV)
  useEffect(() => {
    deviceAdvisor.applyMode();
  }, []);

  useEffect(() => {
    gamepadService.init({
      onBack: () => {
        if (activePlayer) {
          setActivePlayer(null);
        } else if (selectedMedia) {
          setSelectedMedia(null);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        }
      },
      onTabNext: () => {
        const tabs = ["home", "movies", "series", "anime", "favorites"];
        setActiveTab((curr) => {
          const idx = tabs.indexOf(curr);
          const next = tabs[(idx + 1) % tabs.length];
          window.scrollTo({ top: 0, behavior: "smooth" });
          return next;
        });
      },
      onTabPrev: () => {
        const tabs = ["home", "movies", "series", "anime", "favorites"];
        setActiveTab((curr) => {
          const idx = tabs.indexOf(curr);
          const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
          window.scrollTo({ top: 0, behavior: "smooth" });
          return prev;
        });
      },
      onSurprise: () => {
        handleRandomSurprise();
      },
    });
  }, [activePlayer, selectedMedia, settingsOpen]);

  // Load Initial Data
  useEffect(() => {
    let isMounted = true;
    setLoadingHome(true);

    Promise.all([
      catalogProvider.getHomeFeeds().catch(() => null),
      tmdbApi.getPopularAnime(1),
      tmdbApi.getRecentAnime(1),
      tmdbApi.getAnimeMovies(1),
      tmdbApi.getAnimeActionShonen(1),
      tmdbApi.getAnimeFantasyIsekai(1),
      tmdbApi.getUpcomingMovies(1),
      tmdbApi.getAiringTodayTV(1),
    ])
      .then(
        async ([
          feeds,
          anime,
          recentAnimes,
          animMovies,
          shonen,
          isekai,
          upcoming,
          airingToday,
        ]) => {
          if (!isMounted) return;

          let trendingList = [];
          let nowPlayingList = [];
          let trendingSeriesList = [];

          if (feeds && feeds.success && feeds.trendingMovies?.length > 0) {
            trendingList = feeds.trendingMovies;
            nowPlayingList = feeds.topMovies || [];
            trendingSeriesList = feeds.trendingSeries || [];
          } else {
            const [trending, nowPlaying, trendingSeries] = await Promise.all([
              tmdbApi.getTrendingMovies(1),
              tmdbApi.getNowPlayingMovies(1),
              tmdbApi.getTrendingTV(1),
            ]);
            trendingList = trending.results || [];
            nowPlayingList = nowPlaying.results || [];
            trendingSeriesList = trendingSeries.results || [];
          }

          setTrendingMovies(trendingList);
          setNowPlayingMovies(nowPlayingList);
          setPopularAnime(anime.results || []);
          setRecentAnime(recentAnimes.results || []);
          setTrendingTV(trendingSeriesList);
          setAnimeMovies(animMovies.results || []);
          setAnimeShonen(shonen.results || []);
          setAnimeIsekai(isekai.results || []);
          setUpcomingMovies(upcoming.results || []);
          setAiringTodayTV(airingToday.results || []);

          if (trendingList.length > 0) {
            setHeroItem(trendingList[0]);
          }
          setLoadingHome(false);

          // Load TVmaze schedule
          tvmazeApi.getScheduleToday().then((sched) => {
            if (isMounted) setTvmazeSchedule(sched);
          }).catch(() => {});

          // Load Trakt Mindfuck & Twists collection for home
          traktApi.getListItems("mindfuck").then((items) => {
            if (isMounted) setTraktHomeFeatured(items);
          }).catch(() => {});
        }
      )
      .catch((err) => {
        console.error("Erreur de chargement home:", err);
        if (isMounted) setLoadingHome(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K or Cmd+K to focus search, Esc to close modals)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === "Escape") {
        if (selectedMedia) setSelectedMedia(null);
        else if (settingsOpen) setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedMedia, settingsOpen]);

  // Fetch items when mood changes
  useEffect(() => {
    if (!selectedMood) {
      setMoodResults([]);
      return;
    }
    setMoodLoading(true);
    const fetchMood = async () => {
      try {
        let res;
        if (selectedMood.type === "tv") {
          res = await tmdbApi.discoverTV(1, {
            genre: selectedMood.genre,
            sortBy: selectedMood.sortBy || "popularity.desc",
            minVote: selectedMood.minRating,
          });
        } else {
          res = await tmdbApi.discoverMovies(1, {
            genre: selectedMood.genre,
            sortBy: selectedMood.sortBy || "popularity.desc",
            minVote: selectedMood.minRating,
          });
        }
        const items = (res.results || [])
          .filter((i) => i.poster_path)
          .map((i) => ({ ...i, media_type: selectedMood.type }));
        setMoodResults(items);
      } catch (err) {
        console.error("Mood error:", err);
      } finally {
        setMoodLoading(false);
      }
    };
    fetchMood();
  }, [selectedMood]);

  // Fetch items for Trakt tab
  useEffect(() => {
    if (activeTab === "trakt") {
      let isMounted = true;
      setTraktLoading(true);
      traktApi.getListItems(selectedTraktList)
        .then((items) => {
          if (isMounted) {
            setTraktItems(items);
            setTraktLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setTraktLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, selectedTraktList]);

  // Live Search with Debounce and Category Filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchPage(1);
      setSearchTotalPages(1);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      setSearchPage(1);
      fetchSearchResults(searchQuery, searchCategory, 1, false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchCategory]);

  const fetchSearchResults = async (query, category, page = 1, isAppend = false) => {
    if (!query.trim()) return;
    if (isAppend) {
      setLoadingMoreSearch(true);
    } else {
      setIsSearching(true);
    }

    try {
      const data = await catalogProvider.search({ query, category, page });
      setSearchTotalPages(data.total_pages || 1);

      let valid = data.results || [];

      // Smart ranking: Exact title matches and franchise prefixes first
      const cleanQ = query.trim().toLowerCase();
      valid.sort((a, b) => {
        const aTitle = (a.title || a.name || "").toLowerCase();
        const bTitle = (b.title || b.name || "").toLowerCase();

        const aExact = aTitle === cleanQ;
        const bExact = bTitle === cleanQ;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aTitle.startsWith(cleanQ);
        const bStarts = bTitle.startsWith(cleanQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return (b.popularity || 0) - (a.popularity || 0);
      });

      if (isAppend) {
        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((p) => `${p.id}-${p.media_type}`));
          const newUnique = valid.filter((p) => !existingIds.has(`${p.id}-${p.media_type}`));
          return [...prev, ...newUnique];
        });
        setLoadingMoreSearch(false);
      } else {
        setSearchResults(valid);
        setIsSearching(false);
      }
    } catch (err) {
      console.error(err);
      setIsSearching(false);
      setLoadingMoreSearch(false);
    }
  };

  const handleLoadMoreSearch = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    fetchSearchResults(searchQuery, searchCategory, nextPage, true);
  };

  // Fetch tab items for a specific page
  const fetchTabItems = (page, isAppend = false) => {
    if (activeTab === "home" || activeTab === "favorites") return;

    if (isAppend) {
      setLoadingMore(true);
    } else {
      setTabLoading(true);
    }

    let promise;

    if (activeTab === "movies") {
      promise = catalogProvider.getMovies({ page, genre: selectedGenre });
    } else if (activeTab === "series") {
      promise = catalogProvider.getSeries({ page, genre: selectedGenre });
    } else if (activeTab === "anime") {
      if (selectedLetter) {
        promise = tmdbApi.searchMulti(selectedLetter === "#" ? "0" : selectedLetter, page).then((data) => ({
          ...data,
          results: (data.results || []).filter(
            (r) =>
              (r.media_type === "tv" || r.media_type === "movie") &&
              r.original_language === "ja" &&
              (r.genre_ids?.includes(16) || r.genres?.some((g) => g.id === 16)) &&
              (r.poster_path || r.backdrop_path)
          ),
        }));
      } else if (animeSource === "anilist_trending") {
        promise = anilistApi.getTrending(page).then((items) => ({
          results: items.map((m) => ({
            id: m.id,
            title: m.title?.romaji || m.title?.english || "Anime",
            customPoster: m.coverImage?.extraLarge || m.coverImage?.large,
            backdrop_path: m.bannerImage,
            vote_average: m.averageScore ? m.averageScore / 10 : 8.0,
            overview: m.description,
            media_type: "tv",
            source: "anilist",
          })),
        }));
      } else if (animeSource === "anilist_season") {
        promise = anilistApi.getThisSeason(page).then((items) => ({
          results: items.map((m) => ({
            id: m.id,
            title: m.title?.romaji || m.title?.english || "Anime",
            customPoster: m.coverImage?.large,
            backdrop_path: m.bannerImage,
            vote_average: m.averageScore ? m.averageScore / 10 : 8.0,
            overview: m.description,
            media_type: "tv",
            source: "anilist",
          })),
        }));
      } else if (animeSource === "mal_top") {
        promise = jikanApi.getTopAnime(page).then((items) => ({ results: items }));
      } else if (animeSource === "studio" && selectedStudio) {
        promise = anilistApi.getByStudio(selectedStudio, page).then((items) => ({
          results: items.map((m) => ({
            id: m.id,
            title: m.title?.romaji || m.title?.english || "Anime",
            customPoster: m.coverImage?.large,
            vote_average: m.averageScore ? m.averageScore / 10 : 8.0,
            overview: m.description,
            media_type: "tv",
            source: "anilist",
          })),
        }));
      } else {
        promise = tmdbApi.getPopularAnime(page);
      }
    }

    if (promise) {
      promise
        .then((data) => {
          let results = data.results || [];
          if (activeTab === "anime" && !animeSource.startsWith("anilist") && animeSource !== "mal_top") {
            results = results.map((item) => ({
              ...item,
              media_type: "tv",
              original_language: "ja",
              genre_ids: [16],
            }));
          }
          if (isAppend) {
            setTabItems((prev) => [...prev, ...results]);
            setLoadingMore(false);
          } else {
            setTabItems(results);
            setTabLoading(false);
          }
        })
        .catch(() => {
          setTabLoading(false);
          setLoadingMore(false);
        });
    }
  };

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchTabItems(1, false);
  }, [
    activeTab,
    selectedGenre,
    selectedPlatform,
    selectedLetter,
    selectedYear,
    selectedSort,
    selectedMinRating,
    animeSource,
    selectedStudio,
  ]);

  // Load next page
  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchTabItems(nextPage, true);
  };

  const toggleFavorite = (item) => {
    const type = item.media_type || (item.title ? "movie" : "tv");
    const updated = storage.toggleWatchlist({ ...item, media_type: type });
    setFavorites(updated);
  };

  const handleStartPlay = (media, season = 1, episode = 1, language) => {
    const type = media.media_type || (media.title ? "movie" : "tv");
    setActivePlayer({
      media: { ...media, media_type: type },
      season,
      episode,
      language: language || languageAdvisor.getRecommendedLanguage(media),
    });
    setHistory(storage.getHistory());
  };

  // Surprise Me Handler
  const handleRandomSurprise = async () => {
    try {
      const surprise = await tmdbApi.getRandomSurprise();
      if (surprise) {
        setSelectedMedia(surprise);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const movieGenres = [
    { id: 28, name: "Action" },
    { id: 12, name: "Aventure" },
    { id: 35, name: "Comédie" },
    { id: 878, name: "Sci-Fi" },
    { id: 27, name: "Horreur" },
    { id: 53, name: "Thriller" },
    { id: 16, name: "Animation" },
  ];

  const tvGenres = [
    { id: 10759, name: "Action & Aventure" },
    { id: 35, name: "Comédie" },
    { id: 18, name: "Drame" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 9648, name: "Mystère" },
    { id: 16, name: "Animation" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#e0e2ec] flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedGenre(null);
          setSelectedPlatform(null);
          setSelectedLetter(null);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDonate={() => setDonateOpen(true)}
        onRandomSurprise={handleRandomSurprise}
        onOpenSearch={() => setSearchOverlayOpen(true)}
      />

      {/* Mobile Search Overlay — completely isolated from Navbar re-renders */}
      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        onSearch={(q) => {
          setSearchQuery(q);
        }}
        initialQuery={searchQuery}
      />

      {/* Floating Animated Catalog Stats on the Left (for wide screens) */}
      {activeTab === "home" && !searchQuery.trim() && (
        <LiveCatalogStats isFloating={true} />
      )}

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8">
        {/* VIEW 1: SEARCH ACTIVE */}
        {searchQuery.trim() ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Résultats pour "{searchQuery}"</span>
                  {isSearching && (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  )}
                </h2>
                <span className="text-xs text-zinc-400">
                  {searchResults.length} titres affichés {searchTotalPages > 1 && `(Page ${searchPage}/${searchTotalPages})`}
                </span>
              </div>

              {/* Search Category Filter Pills */}
              <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto overflow-x-auto shadow-inner">
                {[
                  { id: "all", label: "🌟 Tout" },
                  { id: "movie", label: "🎬 Films" },
                  { id: "tv", label: "📺 Séries" },
                  { id: "anime", label: "⚡ Animes" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSearchCategory(cat.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                      searchCategory === cat.id
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/40"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {searchResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {searchResults.map((item, idx) => (
                    <MediaCard
                      key={`${item.id}-${item.media_type}-${idx}`}
                      item={item}
                      onSelect={() => setSelectedMedia(item)}
                      isFavorite={isItemFavorite(item)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                {/* Load More Search Results */}
                {searchPage < searchTotalPages && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={handleLoadMoreSearch}
                      disabled={loadingMoreSearch}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white font-bold text-sm border border-white/10 hover:border-orange-500/40 shadow-lg hover:scale-105 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMoreSearch ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                          <span>Chargement de la page {searchPage + 1}...</span>
                        </>
                      ) : (
                        <span>⚡ Charger plus de résultats (+20)</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : !isSearching ? (
              <div className="py-20 text-center text-zinc-500">
                Aucun résultat pour cette recherche. Essayez un autre titre ou changez de filtre.
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {/* VIEW 2: ACCUEIL */}
            {activeTab === "home" && (
              <>
                {/* Hero Featured Banner */}
                {heroItem && (
                  <HeroBanner
                    item={heroItem}
                    onPlay={(item) => handleStartPlay(item, 1, 1)}
                    onMoreInfo={(item) => setSelectedMedia(item)}
                    isFavorite={isItemFavorite(heroItem)}
                    onToggleFavorite={toggleFavorite}
                  />
                )}

                {/* Animated Library Status Banner (Visible on all screens) */}
                <LiveCatalogStats isFloating={false} />

                {/* Partenaire VPN Sécurité & Débridage (Haute Visibilité) */}
                <VpnBanner />

                {/* History / Continuer la lecture (if any) */}
                {history.length > 0 && (
                  <MediaRow
                    title="🕒 Reprendre la lecture"
                    subtitle="Vos derniers films, épisodes et animes visionnés"
                    items={history}
                    onSelect={(item) =>
                      handleStartPlay(item, item.season || 1, item.episode || 1)
                    }
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    badge="Historique"
                  />
                )}

                {/* Que regarder ce soir ? (Guide d'Humeur) */}
                <MoodSelector
                  selectedMood={selectedMood}
                  onSelectMood={setSelectedMood}
                />

                {/* Mood Results Row if selected */}
                {selectedMood && (
                  <div className="mb-8">
                    {moodLoading ? (
                      <div className="py-12 flex justify-center items-center gap-3 text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-sm">Recherche des meilleurs titres pour cette humeur...</span>
                      </div>
                    ) : moodResults.length > 0 ? (
                      <MediaRow
                        title={`✨ Sélection : ${selectedMood.label}`}
                        subtitle={selectedMood.desc}
                        items={moodResults}
                        onSelect={(item) => setSelectedMedia(item)}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        badge="Sur mesure"
                      />
                    ) : (
                      <p className="text-xs text-zinc-500 py-4 text-center">Aucun résultat trouvé pour cette humeur.</p>
                    )}
                  </div>
                )}

                {/* Loading state */}
                {loadingHome ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium">
                      Chargement des catalogues en direct...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* TOP 10 NETFLIX STYLE */}
                    <Top10Row
                      title="Top 10 en France aujourd'hui"
                      subtitle="Les 10 plus gros succès cinéma du moment"
                      items={trendingMovies}
                      onSelect={(item) => setSelectedMedia(item)}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* SORTIES DE LA SEMAINE / DU JOUR */}
                    {airingTodayTV.length > 0 && (
                      <MediaRow
                        title="🔔 Épisodes Séries Diffusés Aujourd'hui"
                        subtitle="Les nouveaux épisodes diffusés ce jour sur les chaînes officielles"
                        items={airingTodayTV}
                        onSelect={(item) =>
                          setSelectedMedia({ ...item, media_type: "tv" })
                        }
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        badge="Aujourd'hui"
                      />
                    )}

                    {upcomingMovies.length > 0 && (
                      <MediaRow
                        title="📅 Sorties Cinéma & Streaming de la Semaine"
                        subtitle="Les films très attendus qui sortent cette semaine"
                        items={upcomingMovies}
                        onSelect={(item) =>
                          setSelectedMedia({ ...item, media_type: "movie" })
                        }
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        badge="Bientôt"
                      />
                    )}

                    {/* CALENDRIER SERIES DU JOUR (TVMAZE) */}
                    {tvmazeSchedule.length > 0 && (
                      <MediaRow
                        title="📅 Sorties Séries & Épisodes du Jour (TVmaze)"
                        subtitle="Diffusions en direct aujourd'hui sur les chaînes et plateformes de streaming"
                        items={tvmazeSchedule}
                        onSelect={(item) => setSelectedMedia(item)}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        badge="TVmaze Live"
                      />
                    )}

                    {/* ANIMES DU MOMENT */}
                    <MediaRow
                      title="⚡ Animes Populaires"
                      subtitle="Les séries d'animation japonaises les plus suivies"
                      items={popularAnime}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "tv" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* TOP 10 ANIMES */}
                    <Top10Row
                      title="Top 10 Animes les plus vus"
                      subtitle="Le classement des animes incontournables"
                      items={popularAnime}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "tv" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* Nouveaux Films */}
                    <MediaRow
                      title="🍿 Nouveautés Films & Cinéma"
                      subtitle="Les derniers films sortis et disponibles"
                      items={nowPlayingMovies}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "movie" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      badge="Nouveau"
                    />

                    {/* Shonen & Action */}
                    <MediaRow
                      title="⚔️ Shonen & Action"
                      subtitle="Combats épiques et aventures palpitantes"
                      items={animeShonen}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "tv" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* Séries TV en vedette */}
                    <MediaRow
                      title="📺 Séries TV Populaires"
                      subtitle="Les saisons et séries les plus regardées"
                      items={trendingTV}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "tv" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* Isekai & Fantasy */}
                    <MediaRow
                      title="✨ Isekai & Mondes Fantastiques"
                      subtitle="Réincarnation, magie et mondes parallèles"
                      items={animeIsekai}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "tv" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />

                    {/* Films d'animation japonais */}
                    <MediaRow
                      title="🌸 Films d'Animation Japonais"
                      subtitle="Longs-métrages d'anime et chefs-d'œuvre"
                      items={animeMovies}
                      onSelect={(item) =>
                        setSelectedMedia({ ...item, media_type: "movie" })
                      }
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />
                  </>
                )}
              </>
            )}

            {/* VIEW 3: FILMS TAB */}
            {activeTab === "movies" && (
              <div>
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Film className="w-6 h-6 text-orange-400" />
                      <span>Catalogue Films</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Parcourez l'intégralité du box-office, nouveautés et classiques
                    </p>
                  </div>

                  {/* Platforms filter */}
                  <PlatformFilter
                    selectedPlatform={selectedPlatform}
                    onSelectPlatform={(p) => {
                      setSelectedPlatform(p);
                      setSelectedGenre(null);
                    }}
                  />

                  {/* Genre Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => {
                        setSelectedGenre(null);
                        setSelectedPlatform(null);
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                        selectedGenre === null && selectedPlatform === null
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/40"
                          : "bg-zinc-850 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tous les genres
                    </button>
                    {movieGenres.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setSelectedGenre(g.id);
                          setSelectedPlatform(null);
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                          selectedGenre === g.id
                            ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/40"
                            : "bg-zinc-850 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  {/* Year & Sort Filters */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {/* Sort Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Tri :</span>
                      <select
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="popularity.desc">🔥 Les plus populaires</option>
                        <option value="vote_average.desc">⭐ Les mieux notés (+100 votes)</option>
                        <option value="primary_release_date.desc">📅 Dernières sorties</option>
                      </select>
                    </div>

                    {/* Year Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Année :</span>
                      <select
                        value={selectedYear || ""}
                        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="">Toutes les années</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2020">2020</option>
                        <option value="2015">2015</option>
                        <option value="2010">2010</option>
                        <option value="2000">Années 2000</option>
                        <option value="1990">Années 90</option>
                      </select>
                    </div>

                    {/* Minimum Rating Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Note min :</span>
                      <select
                        value={selectedMinRating || ""}
                        onChange={(e) => setSelectedMinRating(e.target.value ? Number(e.target.value) : null)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="">Toutes les notes</option>
                        <option value="8.0">⭐ +8.0 (Chef-d'œuvre)</option>
                        <option value="7.5">⭐ +7.5 (Très bon)</option>
                        <option value="7.0">⭐ +7.0 (Bon)</option>
                        <option value="6.0">⭐ +6.0 (Correct)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {tabLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {tabItems.map((item, idx) => (
                        <MediaCard
                          key={`${item.id}-${item.media_type || "movie"}-${idx}`}
                          item={{ ...item, media_type: "movie" }}
                          onSelect={() =>
                            setSelectedMedia({ ...item, media_type: "movie" })
                          }
                          isFavorite={isItemFavorite({ ...item, media_type: "movie" })}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>

                    {/* Load More Button */}
                    <div className="mt-10 flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-white/10 hover:border-indigo-500/40 shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span>Chargement de la page {currentPage + 1}...</span>
                          </>
                        ) : (
                          <span>⚡ Charger plus de films (+20 titres)</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VIEW 4: SÉRIES TAB */}
            {activeTab === "series" && (
              <div>
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Tv className="w-6 h-6 text-emerald-400" />
                      <span>Catalogue Séries TV</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Toutes les séries avec sélection des saisons et épisodes
                    </p>
                  </div>

                  {/* Platforms filter */}
                  <PlatformFilter
                    selectedPlatform={selectedPlatform}
                    onSelectPlatform={(p) => {
                      setSelectedPlatform(p);
                      setSelectedGenre(null);
                    }}
                  />

                  {/* Genre Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => {
                        setSelectedGenre(null);
                        setSelectedPlatform(null);
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                        selectedGenre === null && selectedPlatform === null
                          ? "bg-emerald-600 text-white shadow"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Toutes
                    </button>
                    {tvGenres.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setSelectedGenre(g.id);
                          setSelectedPlatform(null);
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                          selectedGenre === g.id
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  {/* Year & Sort Filters for Series */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Tri :</span>
                      <select
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="popularity.desc">🔥 Séries Populaires</option>
                        <option value="vote_average.desc">⭐ Mieux Notées (+50 votes)</option>
                        <option value="primary_release_date.desc">📅 Nouveautés</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Année :</span>
                      <select
                        value={selectedYear || ""}
                        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="">Toutes les années</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2020">2020</option>
                        <option value="2015">2015</option>
                        <option value="2010">2010</option>
                        <option value="2000">Années 2000</option>
                        <option value="1990">Années 90</option>
                      </select>
                    </div>

                    {/* Minimum Rating Selector for Series */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400">Note min :</span>
                      <select
                        value={selectedMinRating || ""}
                        onChange={(e) => setSelectedMinRating(e.target.value ? Number(e.target.value) : null)}
                        className="bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
                      >
                        <option value="">Toutes les notes</option>
                        <option value="8.0">⭐ +8.0 (Chef-d'œuvre)</option>
                        <option value="7.5">⭐ +7.5 (Très bon)</option>
                        <option value="7.0">⭐ +7.0 (Bon)</option>
                        <option value="6.0">⭐ +6.0 (Correct)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {tabLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {tabItems.map((item, idx) => (
                        <MediaCard
                          key={`${item.id}-${item.media_type || "tv"}-${idx}`}
                          item={{ ...item, media_type: "tv" }}
                          onSelect={() =>
                            setSelectedMedia({ ...item, media_type: "tv" })
                          }
                          isFavorite={isItemFavorite({ ...item, media_type: "tv" })}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>

                    {/* Load More Button */}
                    <div className="mt-10 flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-white/10 hover:border-emerald-500/40 shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Chargement de la page {currentPage + 1}...</span>
                          </>
                        ) : (
                          <span>⚡ Charger plus de séries (+20 titres)</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VIEW 5: ANIMES TAB (Anime-Sama Style) */}
            {activeTab === "anime" && (
              <div>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Play className="w-6 h-6 text-pink-400 fill-pink-400" />
                        <span>Espace Animes</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        AniList • MyAnimeList • TMDB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                        🌸 Multi-Sources Otaku
                      </span>
                    </div>
                  </div>

                  {/* Otaku Source & Studio Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                    <button
                      onClick={() => {
                        setAnimeSource("anilist_trending");
                        setSelectedStudio(null);
                        setSelectedLetter(null);
                      }}
                      className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                        animeSource === "anilist_trending"
                          ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20"
                          : "bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>Tendances (AniList)</span>
                    </button>

                    <button
                      onClick={() => {
                        setAnimeSource("anilist_season");
                        setSelectedStudio(null);
                        setSelectedLetter(null);
                      }}
                      className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                        animeSource === "anilist_season"
                          ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20"
                          : "bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                      <span>Simulcast / Saison en cours (AniList)</span>
                    </button>

                    <button
                      onClick={() => {
                        setAnimeSource("mal_top");
                        setSelectedStudio(null);
                        setSelectedLetter(null);
                      }}
                      className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                        animeSource === "mal_top"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <span>🏆 Top All-Time (MyAnimeList)</span>
                    </button>

                    {/* Studio Buttons */}
                    <div className="flex items-center gap-1 bg-zinc-800/60 p-1 rounded-xl border border-white/5 overflow-x-auto">
                      <span className="text-[11px] font-semibold text-zinc-400 px-2">🎨 Studios :</span>
                      {["MAPPA", "ufotable", "WIT STUDIO", "Madhouse", "Bones"].map((studio) => {
                        const isStudioActive = animeSource === "studio" && selectedStudio === studio;
                        return (
                          <button
                            key={studio}
                            onClick={() => {
                              setAnimeSource("studio");
                              setSelectedStudio(studio);
                              setSelectedLetter(null);
                            }}
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                              isStudioActive
                                ? "bg-pink-600 text-white font-bold shadow"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {studio}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setAnimeSource("tmdb_all");
                        setSelectedStudio(null);
                      }}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                        animeSource === "tmdb_all"
                          ? "bg-zinc-700 text-white"
                          : "bg-zinc-800/50 text-zinc-400 hover:text-white"
                      }`}
                    >
                      🌐 Tout le catalogue (TMDB)
                    </button>
                  </div>

                  {/* Alphabet Bar A-Z (Anime-Sama style) */}
                  <AlphabetBar
                    activeLetter={selectedLetter}
                    onSelectLetter={(letter) => {
                      setSelectedLetter(letter);
                      if (letter) {
                        setAnimeSource("tmdb_all");
                        setSelectedStudio(null);
                      }
                    }}
                  />
                </div>

                {tabLoading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {tabItems.map((item, idx) => (
                      <MediaCard
                        key={`${item.id}-${item.media_type || "tv"}-${idx}`}
                        item={{
                          ...item,
                          media_type: "tv",
                          original_language: "ja",
                          genre_ids: [16],
                        }}
                        onSelect={() =>
                          setSelectedMedia({
                            ...item,
                            media_type: "tv",
                            original_language: "ja",
                            genre_ids: [16],
                          })
                        }
                        isFavorite={isItemFavorite({ ...item, media_type: "tv" })}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>

                  {/* Load More Anime Button */}
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-white/10 hover:border-pink-500/40 shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                          <span>Chargement de la page {currentPage + 1}...</span>
                        </>
                      ) : (
                        <span>⚡ Charger plus d'animes (+20 titres)</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

            {/* VIEW: FAVORIS / WATCHLIST */}
            {activeTab === "favorites" && (
              <div>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Bookmark className="w-6 h-6 text-orange-400" />
                      <span>Mes Favoris (Watchlist)</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Vos films, séries et animes enregistrés
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">
                      {favorites.length} enregistrés
                    </span>
                    {favorites.length > 0 && (
                      <button
                        onClick={() => {
                          const data = JSON.stringify(favorites, null, 2);
                          const blob = new Blob([data], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `erodium-favoris-${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
                      >
                        📥 Exporter
                      </button>
                    )}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer">
                      📤 Importer
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const imported = JSON.parse(ev.target.result);
                              if (Array.isArray(imported)) {
                                const merged = [...imported];
                                favorites.forEach((f) => {
                                  if (!merged.find((m) => m.id === f.id && m.media_type === f.media_type)) merged.push(f);
                                });
                                localStorage.setItem("erodium_watchlist", JSON.stringify(merged));
                                localStorage.setItem("novastream_watchlist", JSON.stringify(merged));
                                setFavorites(merged);
                              }
                            } catch { alert("Fichier JSON invalide."); }
                          };
                          reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Watchlist Subcategory Tabs */}
                {favorites.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none border-b border-white/5">
                    {[
                      { id: "all", label: "Tous", count: favorites.length },
                      {
                        id: "plan_to_watch",
                        label: "À voir",
                        count: favorites.filter((f) => !f.status || f.status === "plan_to_watch").length,
                      },
                      {
                        id: "watching",
                        label: "En cours",
                        count: favorites.filter((f) => f.status === "watching").length,
                      },
                      {
                        id: "completed",
                        label: "Terminé",
                        count: favorites.filter((f) => f.status === "completed").length,
                      },
                    ].map((tab) => {
                      const isSelected = watchlistCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setWatchlistCategory(tab.id)}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 border border-orange-400/40"
                              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(() => {
                  const filteredFavs = favorites.filter((f) => {
                    if (watchlistCategory === "all") return true;
                    if (watchlistCategory === "plan_to_watch") return !f.status || f.status === "plan_to_watch";
                    return f.status === watchlistCategory;
                  });

                  if (filteredFavs.length > 0) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredFavs.map((item, idx) => (
                          <div key={`${item.id}-${item.media_type}-${idx}`} className="flex flex-col gap-1.5">
                            <MediaCard
                              item={item}
                              onSelect={() => setSelectedMedia(item)}
                              isFavorite={true}
                              onToggleFavorite={toggleFavorite}
                            />
                            {/* Quick Status Selector */}
                            <div className="px-1 flex items-center justify-between text-[10px]">
                              <select
                                value={item.status || "plan_to_watch"}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  const updated = storage.updateWatchlistStatus(
                                    item.id,
                                    item.media_type,
                                    newStatus
                                  );
                                  setFavorites(updated);
                                }}
                                className="w-full bg-zinc-900 text-zinc-300 hover:text-white border border-white/10 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500"
                              >
                                <option value="plan_to_watch">📌 À voir</option>
                                <option value="watching">▶️ En cours</option>
                                <option value="completed">✅ Terminé</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (favorites.length > 0) {
                    return (
                      <div className="py-16 text-center text-zinc-500 text-xs">
                        Aucun favori dans la catégorie « {watchlistCategory === "watching" ? "En cours" : watchlistCategory === "completed" ? "Terminé" : "À voir"} ».
                      </div>
                    );
                  }

                  return (
                    <div className="py-24 text-center space-y-3">
                      <Bookmark className="w-12 h-12 text-zinc-600 mx-auto" />
                      <p className="text-sm text-zinc-400">
                        Vous n'avez pas encore de favoris.
                      </p>
                      <p className="text-xs text-zinc-500">
                        Cliquez sur l'icône de marque-page d'un film ou d'un anime
                        pour le sauvegarder ici.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-zinc-500 glass">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Erodium • Films, Séries & Animes en Streaming HD</p>
          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400">
            <button
              onClick={() => setDonateOpen(true)}
              className="text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span>Soutenir les serveurs</span>
            </button>
            <a
              href="https://www.cyberghostvpn.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors"
            >
              VPN Recommandé
            </a>
            <button
              onClick={() => setSettingsOpen(true)}
              className="hover:text-orange-400 transition-colors cursor-pointer"
            >
              Paramètres
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (iOS & Android) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedGenre(null);
          setSelectedPlatform(null);
          setSelectedLetter(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenSearch={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => {
            const input = document.querySelector('input[type="text"]');
            if (input) input.focus();
          }, 100);
        }}
      />

      {/* MODAL: DETAIL FICHE */}
      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlay={handleStartPlay}
          isFavorite={isItemFavorite(selectedMedia)}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* MODAL / MINI-PLAYER: LECTEUR VIDEO */}
      {activePlayer && (
        <PlayerModal
          media={activePlayer.media}
          initialSeason={activePlayer.season}
          initialEpisode={activePlayer.episode}
          initialLanguage={activePlayer.language || "vf"}
          onClose={() => setActivePlayer(null)}
        />
      )}

      {/* MODAL: PARAMÈTRES */}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onDataCleared={() => {
            setFavorites(storage.getWatchlist());
            setHistory(storage.getHistory());
          }}
        />
      )}

      {/* MODAL: DONS & SOUTIEN */}
      {donateOpen && (
        <DonateModal onClose={() => setDonateOpen(false)} />
      )}
    </div>
  );
}
