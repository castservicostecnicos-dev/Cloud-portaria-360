import React, { useState, useEffect } from 'react';
import {
  Key,
  Compass,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Check,
  Calendar,
  Building,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { KeyControl, LostFoundItem, SpecialService, Block, Apartment } from '../types';

export const OtherControlsView: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [activeSection, setActiveSection] = useState<'chaves' | 'achados' | 'mudancas'>('chaves');
  const [keys, setKeys] = useState<KeyControl[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundItem[]>([]);
  const [specialServices, setSpecialServices] = useState<SpecialService[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);

  // Modals state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showSpecialModal, setShowSpecialModal] = useState(false);

  // Key form
  const [keyType, setKeyType] = useState<KeyControl['type']>('chave');
  const [keyIdent, setKeyIdent] = useState('');
  const [keyNumber, setKeyNumber] = useState('');
  const [keyHandedTo, setKeyHandedTo] = useState('');

  // Lost form
  const [lostItem, setLostItem] = useState('');
  const [lostLocation, setLostLocation] = useState('');
  const [lostBy, setLostBy] = useState('');
  const [lostStored, setLostStored] = useState('Armário da Portaria');

  // Special Service form
  const [specType, setSpecType] = useState<SpecialService['type']>('mudanca_entrada');
  const [specResponsible, setSpecResponsible] = useState('');
  const [specCompany, setSpecCompany] = useState('');
  const [specAptId, setSpecAptId] = useState('apt-101a');
  const [specDate, setSpecDate] = useState(new Date().toISOString().slice(0, 10));
  const [specTime, setSpecTime] = useState('09:00 às 15:00');
  const [specVehicles, setSpecVehicles] = useState('');

  const refreshData = () => {
    setKeys(storage.getKeys());
    setLostFound(storage.getLostFound());
    setSpecialServices(storage.getSpecialServices());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const handleReturnKey = (k: KeyControl) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const returnedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    storage.saveKey({
      ...k,
      returnedAt,
      status: 'devolvido',
    });
  };

  const handleRetrieveLost = (item: LostFoundItem) => {
    const person = prompt('Informe o nome de quem está retirando o item:');
    if (!person) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const retrievedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    storage.saveLostFound({
      ...item,
      retrievedBy: person,
      retrievedAt,
      status: 'retirado',
    });
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const takenAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newKey: KeyControl = {
      id: `key-${Date.now()}`,
      type: keyType,
      identification: keyIdent,
      number: keyNumber,
      handedTo: keyHandedTo,
      takenAt,
      status: 'retirado',
    };
    storage.saveKey(newKey);
    setShowKeyModal(false);
    setKeyIdent('');
    setKeyNumber('');
    setKeyHandedTo('');
  };

  const handleSaveLost = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const foundAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newItem: LostFoundItem = {
      id: `lf-${Date.now()}`,
      item: lostItem,
      foundLocation: lostLocation,
      foundAt,
      foundBy: lostBy || 'Zeladoria',
      storedLocation: lostStored,
      status: 'guardado',
    };
    storage.saveLostFound(newItem);
    setShowLostModal(false);
    setLostItem('');
    setLostLocation('');
  };

  const handleSaveSpecial = (e: React.FormEvent) => {
    e.preventDefault();
    const user = storage.getCurrentUser();
    const newSpec: SpecialService = {
      id: `spec-${Date.now()}`,
      type: specType,
      apartmentId: specAptId,
      blockId: 'bloco-a',
      responsibleName: specResponsible,
      company: specCompany,
      scheduledDate: specDate,
      scheduledTime: specTime,
      vehicles: specVehicles,
      authorizedBy: user.name,
      status: 'agendado',
    };
    storage.saveSpecialService(newSpec);
    setShowSpecialModal(false);
    setSpecResponsible('');
    setSpecCompany('');
    setSpecVehicles('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Section Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Controles Complementares</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Chaves, achados e perdidos, mudanças e reservas.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-lg gap-1 text-xs">
          <button
            onClick={() => setActiveSection('chaves')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'chaves' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Chaves & Controles ({keys.filter((k) => k.status === 'retirado').length} fora)</span>
          </button>

          <button
            onClick={() => setActiveSection('achados')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'achados' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Achados & Perdidos ({lostFound.filter((l) => l.status === 'guardado').length})</span>
          </button>

          <button
            onClick={() => setActiveSection('mudancas')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'mudancas' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Mudanças & Obras ({specialServices.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CHAVES E CONTROLES */}
      {activeSection === 'chaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Claviculário / Chaves e Controles
            </h3>
            {isObserver ? (
              <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Modo Observador
              </span>
            ) : (
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Empréstimo</span>
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Identificação / Nº</th>
                  <th className="py-3 px-4">Entregue Para</th>
                  <th className="py-3 px-4">Retirado em</th>
                  <th className="py-3 px-4">Devolvido em</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{k.identification}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {k.type.toUpperCase()}: {k.number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{k.handedTo}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-300">{k.takenAt}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-400">
                      {k.returnedAt || '---'}
                    </td>
                    <td className="py-3 px-4">
                      {k.status === 'retirado' ? (
                        <span className="text-amber-400 font-semibold text-xs bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded-full">
                          Pendente devolução
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Devolvido</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {k.status === 'retirado' && (
                        isObserver ? (
                          <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                        ) : (
                          <button
                            onClick={() => handleReturnKey(k)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 rounded-lg"
                          >
                            Receber Chave
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: ACHADOS E PERDIDOS */}
      {activeSection === 'achados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Achados e Perdidos da Portaria
            </h3>
            {isObserver ? (
              <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Modo Observador
              </span>
            ) : (
              <button
                onClick={() => setShowLostModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Objeto Encontrado</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lostFound.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-white text-xs leading-tight">{item.item}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        item.status === 'guardado'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                    <p>Local Encontrado: <span className="text-slate-300">{item.foundLocation}</span></p>
                    <p>Encontrado por: <span className="text-slate-300">{item.foundBy}</span></p>
                    <p>Armazenado em: <strong className="text-emerald-400">{item.storedLocation}</strong></p>
                    <p className="font-mono-tabular">Data: {item.foundAt}</p>
                    {item.retrievedBy && (
                      <p className="text-emerald-300 mt-1">
                        Retirado por {item.retrievedBy} em {item.retrievedAt}
                      </p>
                    )}
                  </div>
                </div>

                {item.status === 'guardado' && (
                  isObserver ? (
                    <span className="text-[10px] text-slate-500 font-mono italic text-center block pt-1">Observador</span>
                  ) : (
                    <button
                      onClick={() => handleRetrieveLost(item)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Registrar Entrega ao Dono
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: MUDANÇAS E SERVIÇOS ESPECIAIS */}
      {activeSection === 'mudancas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Controle de Mudanças & Obras Autorizadas
            </h3>
            {isObserver ? (
              <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Modo Observador
              </span>
            ) : (
              <button
                onClick={() => setShowSpecialModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar Mudança / Obra</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialServices.map((spec) => {
              const aptNum = spec.apartmentId.replace('apt-', '').toUpperCase();
              return (
                <div
                  key={spec.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-xs font-bold uppercase text-white bg-slate-800 px-2 py-0.5 rounded">
                        {spec.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-300 font-semibold ml-2">Apt {aptNum}</span>
                    </div>

                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded">
                      {spec.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-400">
                    <p>Responsável: <strong className="text-slate-200">{spec.responsibleName}</strong></p>
                    {spec.company && <p>Empresa: <span className="text-slate-300">{spec.company}</span></p>}
                    <p>Data & Horário: <span className="text-slate-200 font-mono-tabular">{spec.scheduledDate} ({spec.scheduledTime})</span></p>
                    {spec.vehicles && <p>Caminhões/Veículos: <span className="text-slate-300 font-mono">{spec.vehicles}</span></p>}
                    {spec.notes && <p className="text-[11px] text-slate-500">{spec.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Empréstimo de Chave */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveKey}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-semibold text-white">Registrar Empréstimo de Chave / Tag</h3>

            <div>
              <label className="block text-slate-300 mb-1">Tipo de Item</label>
              <select
                value={keyType}
                onChange={(e) => setKeyType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="chave">Chave Física</option>
                <option value="controle_portao">Controle Remoto de Portão</option>
                <option value="tag_acesso">Tag de Acesso</option>
                <option value="dispositivo">Dispositivo de Segurança</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Identificação / Área</label>
              <input
                type="text"
                required
                placeholder="Ex: Salão de Festas, Terraço, Casa de Máquinas..."
                value={keyIdent}
                onChange={(e) => setKeyIdent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Número / Código do Claviculário</label>
              <input
                type="text"
                required
                placeholder="Ex: CH-05"
                value={keyNumber}
                onChange={(e) => setKeyNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Pessoa que Retirou</label>
              <input
                type="text"
                required
                placeholder="Nome do morador ou funcionário"
                value={keyHandedTo}
                onChange={(e) => setKeyHandedTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
              >
                Salvar Empréstimo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Achados e Perdidos */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLost}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-semibold text-white">Cadastrar Objeto Encontrado</h3>

            <div>
              <label className="block text-slate-300 mb-1">Objeto / Descrição *</label>
              <input
                type="text"
                required
                placeholder="Ex: Casaco azul infantil, óculos de sol..."
                value={lostItem}
                onChange={(e) => setLostItem(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Local Onde Foi Encontrado *</label>
              <input
                type="text"
                required
                placeholder="Ex: Academia, Hall da Torre B, Garagem..."
                value={lostLocation}
                onChange={(e) => setLostLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Local Armazenado na Portaria</label>
              <input
                type="text"
                value={lostStored}
                onChange={(e) => setLostStored(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
              >
                Salvar Objeto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Mudanças */}
      {showSpecialModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSpecial}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-semibold text-white">Agendar Mudança ou Obra Especial</h3>

            <div>
              <label className="block text-slate-300 mb-1">Tipo de Operação</label>
              <select
                value={specType}
                onChange={(e) => setSpecType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="mudanca_entrada">Mudança de Entrada</option>
                <option value="mudanca_saida">Mudança de Saída</option>
                <option value="obra">Obra / Reforma</option>
                <option value="entrega_moveis">Entrega de Móveis / Eletros Grandes</option>
                <option value="instalacao_equipamentos">Instalação de Equipamentos</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Apartamento</label>
              <select
                value={specAptId}
                onChange={(e) => setSpecAptId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    Apt {a.number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Responsável / Morador</label>
              <input
                type="text"
                required
                placeholder="Nome do responsável"
                value={specResponsible}
                onChange={(e) => setSpecResponsible(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Empresa de Mudança / Transporte</label>
              <input
                type="text"
                placeholder="Nome da transportadora"
                value={specCompany}
                onChange={(e) => setSpecCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 mb-1">Data Agendada</label>
                <input
                  type="date"
                  value={specDate}
                  onChange={(e) => setSpecDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Horário Permitido</label>
                <input
                  type="text"
                  value={specTime}
                  onChange={(e) => setSpecTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSpecialModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
              >
                Salvar Agendamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
