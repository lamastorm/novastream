import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.modal) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md p-6 glass rounded-2xl border border-white/10 shadow-2xl text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Titre indisponible</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                Les métadonnées de cette œuvre n'ont pas pu être chargées correctement pour l'instant.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    if (this.props.onReset) {
                      this.props.onReset();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-600/30 hover:scale-105 transition-all cursor-pointer"
                >
                  {this.props.resetLabel || "Fermer"}
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Un problème est survenu</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            Une erreur inattendue s'est produite lors de l'affichage de ce titre.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) {
                  this.props.onReset();
                } else {
                  window.location.reload();
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-600/30 hover:scale-105 transition-all cursor-pointer"
            >
              {this.props.resetLabel || "Recharger la page"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
