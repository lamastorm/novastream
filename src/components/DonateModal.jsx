import React, { useState } from "react";
import {
  X,
  Heart,
  Copy,
  Check,
  Server,
  Coins,
} from "lucide-react";
import { MONETIZATION_CONFIG } from "../config/monetization";

export default function DonateModal({ onClose }) {
  const { donations } = MONETIZATION_CONFIG;
  const { bitcoin } = donations;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(bitcoin.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const progressPercent = Math.min(
    100,
    Math.round((donations.monthlyGoal.currentEuros / donations.monthlyGoal.targetEuros) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#141724] to-[#0c0e17] rounded-3xl border border-amber-500/20 shadow-2xl p-5 sm:p-7 z-10 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 text-white mb-1">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">
            {donations.title}
          </h2>
          <p className="text-xs uppercase font-bold tracking-wider text-amber-400">
            {donations.subtitle}
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed pt-1">
            {donations.description}
          </p>
        </div>

        {/* Monthly Goal Tracker */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-zinc-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>Financement serveurs ce mois-ci</span>
            </span>
            <span className="font-extrabold text-amber-400">
              {donations.monthlyGoal.currentEuros} {donations.monthlyGoal.currency} / {donations.monthlyGoal.targetEuros} {donations.monthlyGoal.currency} ({progressPercent}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 text-center">
            Chaque don en Bitcoin permet de maintenir Erodium en ligne, rapide et sans aucune pub.
          </p>
        </div>

        {/* Bitcoin Exclusive Card */}
        <div className="p-5 rounded-2xl bg-black/50 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
                ₿
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">{bitcoin.coin}</p>
                <p className="text-[10px] text-zinc-400">{bitcoin.network}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {bitcoin.tag}
            </span>
          </div>

          {/* QR Code view */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl mx-auto w-fit shadow-xl border-4 border-amber-500/20">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=bitcoin:${encodeURIComponent(bitcoin.address)}`}
              alt="QR Code Bitcoin"
              className="w-40 h-40"
            />
            <span className="text-[11px] text-zinc-800 font-bold mt-1.5 text-center">
              Scanner avec n'importe quel wallet BTC
            </span>
          </div>

          {/* Address display + Copy button */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Adresse Bitcoin officielle :
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 p-3 rounded-xl border border-white/10">
              <code className="text-xs font-mono text-amber-200/90 truncate flex-1 select-all tracking-wide">
                {bitcoin.address}
              </code>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
                  copied
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-orange-500/20"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center pt-1">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>Merci infiniment pour votre soutien envers Erodium !</span>
          </p>
        </div>
      </div>
    </div>
  );
}
