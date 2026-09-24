import React, { useState } from "react";
import {
  X,
  Heart,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Server,
  Coins,
} from "lucide-react";
import { MONETIZATION_CONFIG } from "../config/monetization";

export default function DonateModal({ onClose }) {
  const { donations } = MONETIZATION_CONFIG;
  const [selectedWallet, setSelectedWallet] = useState(donations.cryptoWallets[0]);
  const [copiedId, setCopiedId] = useState(null);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = (wallet) => {
    navigator.clipboard.writeText(wallet.address);
    setCopiedId(wallet.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const progressPercent = Math.min(
    100,
    Math.round((donations.monthlyGoal.currentEuros / donations.monthlyGoal.targetEuros) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#141724] to-[#0c0e17] rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-7 z-10 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-orange-500 shadow-lg shadow-rose-600/30 text-white mb-1">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">
            {donations.title}
          </h2>
          <p className="text-xs uppercase font-bold tracking-wider text-rose-400">
            {donations.subtitle}
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed pt-1">
            {donations.description}
          </p>
        </div>

        {/* Monthly Goal Tracker */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-zinc-300">
              <Server className="w-3.5 h-3.5 text-orange-400" />
              <span>Financement serveurs ce mois-ci</span>
            </span>
            <span className="font-extrabold text-orange-400">
              {donations.monthlyGoal.currentEuros} {donations.monthlyGoal.currency} / {donations.monthlyGoal.targetEuros} {donations.monthlyGoal.currency} ({progressPercent}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 text-center">
            Chaque euro récolté assure la pérennité du service en qualité Full HD sans jamais insérer de publicité.
          </p>
        </div>

        {/* Crypto Wallets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Dons en Crypto (100% Anonyme & Rapide)</span>
            </h3>
            <button
              onClick={() => setShowQr(!showQr)}
              className="text-xs text-zinc-400 hover:text-orange-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQr ? "Cacher QR Code" : "Voir QR Code"}</span>
            </button>
          </div>

          {/* Crypto Selector Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {donations.cryptoWallets.map((wallet) => {
              const isSelected = selectedWallet.id === wallet.id;
              return (
                <button
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/10 border-orange-500/80 shadow-md shadow-orange-500/10"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="text-xs font-black text-white truncate">{wallet.coin}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{wallet.network}</p>
                </button>
              );
            })}
          </div>

          {/* Selected Wallet Detail Box */}
          {selectedWallet && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white">{selectedWallet.coin}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                  {selectedWallet.tag}
                </span>
              </div>

              {/* QR Code view */}
              {showQr && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl mx-auto w-fit shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(selectedWallet.address)}`}
                    alt={`QR Code ${selectedWallet.coin}`}
                    className="w-36 h-36"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 text-center">
                    Scanner avec votre portefeuille
                  </span>
                </div>
              )}

              {/* Address display + Copy button */}
              <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                <code className="text-xs font-mono text-zinc-300 truncate flex-1 select-all">
                  {selectedWallet.address}
                </code>
                <button
                  onClick={() => handleCopy(selectedWallet)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                    copiedId === selectedWallet.id
                      ? "bg-emerald-500 text-white"
                      : "bg-orange-500 hover:bg-orange-400 text-white shadow-sm"
                  }`}
                >
                  {copiedId === selectedWallet.id ? (
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
          )}
        </div>

        {/* Fiat / CB option */}
        {donations.fiatLinks && donations.fiatLinks.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Autre moyen (Carte bancaire) :
            </p>
            {donations.fiatLinks.map((fiat) => (
              <a
                key={fiat.id}
                href={fiat.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-between p-3 rounded-xl text-white font-bold text-xs transition-all shadow-md ${fiat.color}`}
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-white" />
                  <span>{fiat.name}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] opacity-90">
                  <span>{fiat.desc}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-[11px] text-zinc-500">
            Merci infiniment pour votre soutien envers Erodium et le streaming libre sans publicité ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
