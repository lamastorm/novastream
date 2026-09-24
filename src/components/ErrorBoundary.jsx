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
      return (
        <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Un problème est survenu</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            Une erreur inattendue s'est produite lors de l'affichage de ce titre.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-600/30 hover:scale-105 transition-all cursor-pointer"
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
