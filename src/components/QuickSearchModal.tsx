import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Car, Package, Shield, Phone, Building, ArrowRight } from 'lucide-react';
import { storage } from '../services/storage';
import { ActiveTab } from './Sidebar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (tab: ActiveTab, entityId?: string) => void;
}

interface SearchResultItem {
  id: string;
  type: 'morador' | 'veiculo' | 'encomenda' | 'visitante' | 'prestador' | 'apartamento';
  title: string;
  subtitle: string;
  badge: string;
  tab: ActiveTab;
  detail: string;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      performSearch(query);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or shortcut
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = (q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) {
      // Default recent / prominent suggestions
      const defaultResidents = storage.getResidents().slice(0, 3).map((r) => ({
        id: r.id,
        type: 'morador' as const,
        title: r.name,
        subtitle: `Apt ${r.apartmentId.replace('apt-', '').toUpperCase()} · ${r.type}`,
        badge: 'Morador',
        tab: 'apartments' as ActiveTab,
        detail: `Tel: ${r.phone} | CPF: ${r.cpf}`,
      }));
      setResults(defaultResidents);
      return;
    }

    const items: SearchResultItem[] = [];

    // Search Residents
    const residents = storage.getResidents();
    residents.forEach((r) => {
      if (
        r.name.toLowerCase().includes(term) ||
        r.cpf.toLowerCase().includes(term) ||
        r.phone.toLowerCase().includes(term) ||
        r.apartmentId.toLowerCase().includes(term)
      ) {
        items.push({
          id: r.id,
          type: 'morador',
          title: r.name,
          subtitle: `Apt ${r.apartmentId.replace('apt-', '').toUpperCase()} · ${r.type}`,
          badge: 'Morador',
          tab: 'apartments',
          detail: `Tel/WhatsApp: ${r.phone} · CPF: ${r.cpf}`,
        });
      }
    });

    // Search Vehicles
    const vehicles = storage.getVehicles();
    vehicles.forEach((v) => {
      if (
        v.plate.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term) ||
        v.brand.toLowerCase().includes(term) ||
        v.ownerName.toLowerCase().includes(term)
      ) {
        items.push({
          id: v.id,
          type: 'veiculo',
          title: `Placa: ${v.plate.toUpperCase()} - ${v.brand} ${v.model}`,
          subtitle: `${v.ownerName} · Apt ${v.apartmentId.replace('apt-', '').toUpperCase()}`,
          badge: 'Veículo',
          tab: 'vehicles',
          detail: `Cor: ${v.color} · ${v.parkingSpace}`,
        });
      }
    });

    // Search Deliveries
    const deliveries = storage.getDeliveries();
    deliveries.forEach((d) => {
      if (
        d.code.toLowerCase().includes(term) ||
        (d.trackingCode && d.trackingCode.toLowerCase().includes(term)) ||
        d.recipientName.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term)
      ) {
        items.push({
          id: d.id,
          type: 'encomenda',
          title: `${d.code} · ${d.recipientName}`,
          subtitle: `${d.type.toUpperCase()} · Status: ${d.status.replace('_', ' ')}`,
          badge: 'Encomenda',
          tab: 'deliveries',
          detail: `${d.description} · ${d.carrier || 'Sem rastreio'}`,
        });
      }
    });

    // Search Visitors
    const visitors = storage.getVisitors();
    visitors.forEach((vis) => {
      if (
        vis.name.toLowerCase().includes(term) ||
        vis.document.toLowerCase().includes(term) ||
        vis.phone.toLowerCase().includes(term)
      ) {
        items.push({
          id: vis.id,
          type: 'visitante',
          title: vis.name,
          subtitle: `Doc: ${vis.document} · Visita Apt ${vis.apartmentId.replace('apt-', '').toUpperCase()}`,
          badge: 'Visitante',
          tab: 'visitors',
          detail: `Autorizado por: ${vis.authorizedByName || 'Portaria'}`,
        });
      }
    });

    // Search Contractors
    const contractors = storage.getContractors();
    contractors.forEach((c) => {
      if (
        c.name.toLowerCase().includes(term) ||
        c.company.toLowerCase().includes(term) ||
        c.document.toLowerCase().includes(term)
      ) {
        items.push({
          id: c.id,
          type: 'prestador',
          title: `${c.name} (${c.company})`,
          subtitle: `${c.serviceType.replace('_', ' ')} · Apt ${c.apartmentId.replace('apt-', '').toUpperCase()}`,
          badge: 'Prestador',
          tab: 'contractors',
          detail: `Doc: ${c.document} · Válido até ${c.validUntil}`,
        });
      }
    });

    setResults(items);
  };

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item.tab, item.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950">
          <Search className="w-5 h-5 text-emerald-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              performSearch(e.target.value);
            }}
            placeholder="Digite nome, CPF, apartamento (ex: 101), placa de carro, código de encomenda..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                performSearch('');
              }}
              className="text-slate-400 hover:text-white mr-2 text-xs"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/60">
          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum registro encontrado para "<span className="text-white font-medium">{query}</span>".
              <p className="mt-1 text-slate-500">
                Tente pesquisar por número de apartamento (ex: 101, 201), placa veicular ou sobrenome.
              </p>
            </div>
          ) : (
            results.map((item) => {
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="p-3 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                      {item.type === 'morador' && <User className="w-4 h-4 text-emerald-400" />}
                      {item.type === 'veiculo' && <Car className="w-4 h-4 text-sky-400" />}
                      {item.type === 'encomenda' && <Package className="w-4 h-4 text-amber-400" />}
                      {item.type === 'visitante' && <User className="w-4 h-4 text-purple-400" />}
                      {item.type === 'prestador' && <Shield className="w-4 h-4 text-teal-400" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded font-mono">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0 ml-3">
                    <span className="text-[11px] hidden sm:inline mr-1">Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Key tips */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Pesquisa instantânea em tempo real</span>
          <div className="flex items-center gap-3">
            <span>ESC para fechar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
