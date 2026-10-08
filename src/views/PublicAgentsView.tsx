import React, { useState, useEffect } from 'react';
import {
  BadgeCheck,
  Plus,
  Search,
  Shield,
  Clock,
  LogOut,
  AlertCircle,
  Truck,
  Building,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { PublicAgent, PublicAgencyType, Apartment } from '../types';

export const PublicAgentsView: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Public Agent Form State
  const [name, setName] = useState('');
  const [agency, setAgency] = useState<PublicAgencyType>('policia_militar');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [document, setDocument] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [areaVisited, setAreaVisited] = useState('Guarita / Eclusa Social');
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setAgents(storage.getPublicAgents());
    setApartments(storage.getApartments());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.visitPurpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.vehiclePlate && a.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAgency = filterAgency === 'all' || a.agency === filterAgency;
    return matchesSearch && matchesAgency;
  });

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !visitPurpose) {
      alert('Nome e finalidade obrigatória do acesso devem ser preenchidos.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const entryTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const newAgent: PublicAgent = {
      id: `pub-${Date.now()}`,
      name,
      agency,
      badgeNumber: badgeNumber || 'Não informada',
      document: document || 'Funcional apresentada',
      vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase() : undefined,
      visitPurpose,
      areaVisited,
      entryTime,
      operatorId: user.id,
      operatorName: user.name,
      notes,
      status: 'dentro',
    };

    storage.savePublicAgent(newAgent);

    // Also register in Access Log
    storage.saveAccessLog({
      id: `acc-pub-${Date.now()}`,
      personName: `${agency.toUpperCase().replace('_', ' ')}: ${name}`,
      personType: 'agente_publico',
      document,
      purpose: visitPurpose,
      vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase() : undefined,
      entryTime,
      status: 'dentro',
      operatorName: user.name,
      notes: `Matrícula: ${badgeNumber} · Setor: ${areaVisited}`,
    });

    setShowAddModal(false);
    setName('');
    setBadgeNumber('');
    setDocument('');
    setVehiclePlate('');
    setVisitPurpose('');
    setNotes('');
  };

  const handleRegisterExit = (agent: PublicAgent) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const exitTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const updated: PublicAgent = {
      ...agent,
      exitTime,
      status: 'saiu',
    };
    storage.savePublicAgent(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Agentes Públicos & Órgãos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro e acompanhamento de autoridades, policiais e fiscais.
          </p>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 border border-amber-700/60 text-amber-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Modo Observador (Visualização Síndico/ADM)</span>
          </div>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Agente Público</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome, matrícula, viatura ou finalidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterAgency}
          onChange={(e) => setFilterAgency(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">Todos os Órgãos</option>
          <option value="policia_militar">Polícia Militar</option>
          <option value="policia_civil">Polícia Civil</option>
          <option value="bombeiros">Corpo de Bombeiros</option>
          <option value="samu">SAMU / Ambulância</option>
          <option value="correios">Correios</option>
          <option value="fiscalizacao">Fiscalização Municipal / Sanitária</option>
          <option value="concessionaria">Concessionária (Enel, Sabesp, Comgás)</option>
        </select>
      </div>

      {/* Agents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Órgão / Nome</th>
                <th className="py-3 px-4">Matrícula & Funcional</th>
                <th className="py-3 px-4">Finalidade do Acesso (Obrigatória)</th>
                <th className="py-3 px-4">Viatura / Área Visitada</th>
                <th className="py-3 px-4">Entrada / Saída</th>
                <th className="py-3 px-4">Porteiro</th>
                <th className="py-3 px-4 text-right">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhum agente público registrado.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-950/50 text-amber-400 border border-amber-800 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{ag.name}</span>
                          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wide">
                            {ag.agency.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono-tabular">
                      <span className="text-white block font-medium">Matrícula: {ag.badgeNumber}</span>
                      <span className="text-[10px] text-slate-400 block">{ag.document}</span>
                    </td>

                    <td className="py-3 px-4 max-w-[240px]">
                      <span className="text-slate-200 block truncate leading-snug">{ag.visitPurpose}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-300 block">{ag.areaVisited}</span>
                      {ag.vehiclePlate && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded border border-slate-700">
                          Vtr: {ag.vehiclePlate}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono-tabular">
                      <span className="text-slate-200 block">{ag.entryTime.slice(11)}</span>
                      <span className="text-[10px] text-slate-500">
                        {ag.exitTime ? `Saída: ${ag.exitTime.slice(11)}` : 'Ainda no local'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {ag.operatorName.split(' ')[0]}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {ag.status === 'dentro' ? (
                        isObserver ? (
                          <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                        ) : (
                          <button
                            onClick={() => handleRegisterExit(ag)}
                            className="flex items-center gap-1 ml-auto px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 rounded-lg transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Dar Saída</span>
                          </button>
                        )
                      ) : (
                        <span className="text-slate-500 text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-600" />
                          <span>Finalizado</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAgent}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Registrar Agente Público</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Órgão / Instituição *</label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value as PublicAgencyType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="policia_militar">Polícia Militar</option>
                    <option value="policia_civil">Polícia Civil</option>
                    <option value="bombeiros">Corpo de Bombeiros</option>
                    <option value="samu">SAMU / Emergência Médica</option>
                    <option value="guarda_municipal">Guarda Civil Municipal</option>
                    <option value="defesa_civil">Defesa Civil</option>
                    <option value="correios">Correios (Carteiro / Sedex)</option>
                    <option value="fiscalizacao">Fiscalização Municipal / Vigilância</option>
                    <option value="concessionaria">Concessionária (Enel, Sabesp, Comgás)</option>
                    <option value="outro">Outro Órgão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome Completo do Agente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do agente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Matrícula / ID Funcional</label>
                  <input
                    type="text"
                    placeholder="Ex: PM-SP 148902"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Placa da Viatura (se houver)</label>
                  <input
                    type="text"
                    placeholder="VTR-4029"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Finalidade Obrigatória do Acesso *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Averiguação de ocorrência com morador, entrega de malote, fiscalização predial..."
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Área ou Unidade Visitada</label>
                <input
                  type="text"
                  placeholder="Ex: Apartamento 102A, Casa de Máquinas, Guarita..."
                  value={areaVisited}
                  onChange={(e) => setAreaVisited(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações da Portaria</label>
                <input
                  type="text"
                  placeholder="Observações complementares"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Registrar Entrada do Agente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
