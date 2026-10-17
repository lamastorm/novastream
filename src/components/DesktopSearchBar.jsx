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
      className={`relative flex items-center w-full rounded-full transition-all duration-300 ${
        isSearchFocused
          ? "ring-2 ring-purple-500/80 bg-black/90 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.25),0_0_25px_rgba(139,92,246,0.3)]"
          : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
      }`}
    >
      <Search className="w-3.5 h-3.5 text-zinc-400 ml-3.5 flex-shrink-0" />
      <input
        ref={inputRef}
        id="global-search-input"
        type="text"
        inputMode="search"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        placeholder="Rechercher..."
        defaultValue={searchQuery || ""}
        onChange={handleChange}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        className="w-full bg-transparent px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none appearance-none"
      />
      {hasText && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 mr-2 text-zinc-400 hover:text-white rounded-full cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

