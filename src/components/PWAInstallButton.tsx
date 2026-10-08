import React, { useState } from 'react';
import { Download, Smartphone, Monitor, X, Share, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // If already running as an installed standalone app, suppress the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (installed) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions modal for desktop or unsupported browsers
      alert(
        'Para instalar o CAST 360 como aplicativo:\n\n• No Google Chrome/Edge (Computador): clique no ícone de computador/instalação na barra de endereços (à direita).\n• No Celular Android: abra o menu do navegador (3 pontinhos) e toque em "Adicionar à tela inicial" ou "Instalar aplicativo".'
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm ${
          variant === 'full'
            ? 'w-full justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
            : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
        } ${className}`}
        title="Instalar CAST 360 no computador ou celular (PWA)"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className={variant === 'full' ? 'inline' : 'hidden sm:inline'}>
          {variant === 'full' ? 'Instalar App CAST 360' : 'Instalar App'}
        </span>
      </button>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Instalar no iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <p>
                  No navegador <strong>Safari</strong>, toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta para cima{' '}
                  <Share className="w-3.5 h-3.5 inline text-sky-400" />) na barra inferior.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <p>
                  Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <p>
                  Confirme o nome e toque em <strong>Adicionar</strong>. O aplicativo será aberto em tela cheia como um app nativo!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-emerald-900 border border-emerald-500 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>CAST 360 instalado com sucesso!</span>
        </div>
      )}
    </>
  );
};
