import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

/**
 * SearchOverlay — full-screen search panel (mobile + desktop).
 *
 * Completely isolated from App.jsx re-renders while typing.
 * Only pushes the final query up via onSearch() after a debounce.
 * This guarantees zero cursor-reset issues on mobile keyboards.
 */
export default function SearchOverlay({ isOpen, onClose, onSearch, initialQuery = "" }) {
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-focus + pre-fill when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay so the CSS transition has started before focus
      const t = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = initialQuery;
          inputRef.current.focus();
          // Cursor at end
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialQuery]);

  // Clear input when overlay is closed externally (e.g. tab change)
  useEffect(() => {
    if (!isOpen && inputRef.current) {
      inputRef.current.value = "";
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleChange = useCallback(() => {
    const val = inputRef.current ? inputRef.current.value : "";
    setIsLoading(Boolean(val));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsLoading(false);
      onSearch(val);
    }, 350);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    setIsLoading(false);
    clearTimeout(debounceRef.current);
    onSearch("");
  }, [onSearch]);

  const handleClose = useCallback(() => {
    clearTimeout(debounceRef.current);
    onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(9,9,11,0.97)", backdropFilter: "blur(20px)" }}
    >
      {/* Search bar at top */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="flex-1 flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500/50 transition-all">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin flex-shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            dir="ltr"
            placeholder="Films, séries, animes..."
            onChange={handleChange}
            className="flex-1 bg-transparent text-white text-base placeholder-zinc-500 focus:outline-none appearance-none"
            style={{ direction: "ltr", unicodeBidi: "plaintext" }}
          />
          {/* Clear button — reads from DOM, not state */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur before clear
              handleClear();
            }}
            className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleClose}
          className="text-zinc-400 hover:text-white text-sm font-medium px-2 py-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        >
          Annuler
        </button>
      </div>

      {/* Hint text */}
      <div className="flex-1 flex flex-col items-center justify-start pt-16 px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Search className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-zinc-400 text-sm max-w-xs">
          Tape le nom d&apos;un film, d&apos;une série ou d&apos;un anime. Les résultats apparaîtront derrière.
        </p>
        <p className="text-zinc-600 text-xs">Appuie sur <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/10 rounded text-zinc-400 font-mono text-[10px]">Échap</kbd> ou &quot;Annuler&quot; pour fermer</p>
      </div>
    </div>
  );
}
