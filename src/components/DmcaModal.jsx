import React from "react";
import { X, ShieldAlert, FileText, CheckCircle2, Mail, ExternalLink } from "lucide-react";

export default function DmcaModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass rounded-2xl border border-white/10 shadow-2xl z-10 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Mentions Légales & DMCA</h3>
              <p className="text-xs text-zinc-400">Politique de conformité et de protection des droits d'auteur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {/* Article 1 : Non-hébergement */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" />
              <span>1. Clause de non-hébergement et rôle technique</span>
            </h4>
            <p className="text-zinc-400">
              <strong>Erodium n'héberge, ne stocke, ne diffuse ni ne téléverse aucun fichier vidéo ou multimédia</strong> sur ses propres serveurs. Erodium agit exclusivement en tant qu'agrégateur d'informations et moteur de recherche automatisé référençant des flux et lecteurs vidéo publiquement disponibles sur des plateformes d'hébergement tierces et indépendantes (VidMoly, Sibnet, Anime-Sama, etc.).
            </p>
          </div>

          {/* Article 2 : Responsabilité des tiers */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Respect de la propriété intellectuelle (DMCA / EUCD)</span>
            </h4>
            <p className="text-zinc-400">
              Toutes les marques, titres, affiches promotionnelles et métadonnées appartiennent à leurs propriétaires et ayants droit respectifs. Erodium respecte scrupuleusement les dispositions du <em>Digital Millennium Copyright Act</em> (17 U.S.C. § 512) ainsi que les directives européennes sur le droit d'auteur dans le marché unique numérique.
            </p>
          </div>

          {/* Article 3 : Procédure de retrait / Takedown Notice */}
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/20 space-y-2">
            <h4 className="font-bold text-orange-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              <span>3. Procédure de signalement et de retrait immédiat</span>
            </h4>
            <p className="text-zinc-400">
              Si vous êtes détenteur de droits d'auteur ou mandataire légal d'une œuvre référencée et souhaitez demander le déréférencement d'un lien d'indexation, veuillez transmettre votre notification avec les éléments suivants :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-xs">
              <li>L'identification claire de l'œuvre protégée par le droit d'auteur.</li>
              <li>L'URL exacte de la page ou du titre concerné sur Erodium.</li>
              <li>Une déclaration attestant de votre qualité d'ayant droit ou de représentant autorisé.</li>
              <li>Vos coordonnées officielles (adresse email, nom de l'organisation).</li>
            </ul>
          </div>

          {/* Contact action */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white text-xs">Adresse de contact juridique DMCA :</p>
              <p className="text-orange-400 font-mono text-xs">contact@erodium.app</p>
            </div>
            <a
              href="mailto:contact@erodium.app?subject=Demande%20de%20retrait%20DMCA%20-%20Erodium"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Envoyer un signalement
            </a>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
