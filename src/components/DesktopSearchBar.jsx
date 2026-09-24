import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

/**
 * DesktopSearchBar — inline search bar for desktop only (md+).
 * 
 * Uses uncontrolled input so React never touches the DOM value during typing.
 * The liveViewers counter re-renders the parent Navbar, but since this is a
 * separate component with its own render cycle, it is unaffected.
 */
export default function DesktopSearchBar({ searchQuery, setSearchQuery }) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasText, setHasText] = useState(Boolean(searchQuery));
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Only sync when parent clears the query (e.g. tab change) 
  useEffect(() => {
    if (searchQuery === "" && inputRef.current && inputRef.current.value !== "") {
      inputRef.current.value = "";
      setHasText(false);
    }
  }, [searchQuery]);

  const handleChange = () => {
    const val = inputRef.current ? inputRef.current.value : "";
    setHasText(Boolean(val));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 300);
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    setHasText(false);
    clearTimeout(debounceRef.current);
    setSearchQuery("");
  };

  return (
    <div
      className={`relative flex items-center w-full rounded-xl transition-all ${
        isSearchFocused
          ? "ring-2 ring-orange-500 bg-zinc-950 border-orange-500/50 shadow-md shadow-orange-500/20"
          : "bg-zinc-900/80 hover:bg-zinc-900 border border-white/10"
      }`}
    >
      <Search className="w-4 h-4 text-zinc-400 ml-3 flex-shrink-0" />
      <input
        ref={inputRef}
        id="global-search-input"
        type="text"
        inputMode="search"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        placeholder="Rechercher films, séries, animes..."
        defaultValue={searchQuery || ""}
        onChange={handleChange}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        className="w-full bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none appearance-none"
      />
      {hasText ? (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 mr-2 text-zinc-400 hover:text-white rounded-md"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="hidden lg:flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/10 mr-2 flex-shrink-0">
          Ctrl+K
        </span>
      )}
    </div>
  );
}
