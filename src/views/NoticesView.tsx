import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  AlertTriangle,
  Wrench,
  PartyPopper,
  Info,
  Clock,
  CheckCircle2,
  Trash2,
  Users,
  Building,
  Share2,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { CommunicationNotice, NoticeCategory, NoticePriority, Block, Apartment, Resident } from '../types';
import { openWhatsAppLink, sanitizePhoneNumber } from '../services/whatsapp';

export const NoticesView: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [notices, setNotices] = useState<CommunicationNotice[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchWhatsAppNotice, setBatchWhatsAppNotice] = useState<CommunicationNotice | null>(null);

  // New Notice Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('geral');
  const [priority, setPriority] = useState<NoticePriority>('media');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'todos' | 'bloco' | 'apartamento_especifico'>('todos');
  const [targetBlockId, setTargetBlockId] = useState('');
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState('');
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);

  const refreshData = () => {
    setNotices(storage.getNotices());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredNotices = notices.filter((n) => {
    if (filterCategory === 'all') return true;
    return n.category === filterCategory;
  });

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert('Preencha título e conteúdo do comunicado.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const isScheduled = !!scheduledFor && new Date(scheduledFor) > now;

    const newNotice: CommunicationNotice = {
      id: `not-${Date.now()}`,
      title,
      category,
      priority,
      content,
      targetType,
      targetBlockId: targetType === 'bloco' ? targetBlockId : undefined,
      targetApartmentIds: targetType === 'apartamento_especifico' ? selectedAptIds : undefined,
      scheduledFor: isScheduled ? scheduledFor : undefined,
      sentAt: isScheduled ? undefined : nowStr,
      status: isScheduled ? 'agendado' : 'enviado',
      authorName: user ? `${user.name} (${user.role})` : 'Portaria Central',
      sendViaWhatsApp,
      readCount: isScheduled ? 0 : 1,
    };

    storage.saveNotice(newNotice);
    setShowCreateModal(false);

    // Reset form
    setTitle('');
    setContent('');
    setCategory('geral');
    setPriority('media');
    setTargetType('todos');
    setSelectedAptIds([]);
    setScheduledFor('');

    if (sendViaWhatsApp && !isScheduled) {
      setBatchWhatsAppNotice(newNotice);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este comunicado?')) {
      storage.deleteNotice(id);
    }
  };

  const getTargetLabel = (n: CommunicationNotice) => {
    if (n.targetType === 'todos') return 'Todos os Moradores (Condomínio Geral)';
    if (n.targetType === 'bloco') {
      const b = blocks.find((blk) => blk.id === n.targetBlockId);
      return b ? `Moradores da ${b.name} (${b.identification})` : 'Bloco Específico';
    }
    if (n.targetType === 'apartamento_especifico' && n.targetApartmentIds) {
      const aptNums = n.targetApartmentIds
        .map((aid) => aid.replace('apt-', '').toUpperCase())
        .join(', ');
      return `Apartamento(s): ${aptNums}`;
    }
    return 'Geral';
  };

  // Contacts targeted by a notice
  const getTargetedResidents = (notice: CommunicationNotice) => {
    return residents.filter((r) => {
      if (notice.targetType === 'todos') return true;
      if (notice.targetType === 'bloco' && r.blockId === notice.targetBlockId) return true;
      if (
        notice.targetType === 'apartamento_especifico' &&
        notice.targetApartmentIds?.includes(r.apartmentId)
      ) {
        return true;
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Mural de Avisos
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todas as Categorias ({notices.length})</option>
            <option value="geral">Avisos Gerais</option>
            <option value="manutencao">Manutenções</option>
            <option value="seguranca">Segurança</option>
            <option value="evento">Eventos & Assembleias</option>
            <option value="urgencia">Urgências</option>
          </select>

          {isObserver ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-lg text-xs font-semibold shrink-0">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Modo Observador</span>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Comunicado</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Notices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotices.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-xl">
            Nenhum comunicado encontrado nesta categoria.
          </div>
        ) : (
          filteredNotices.map((n) => {
            const targeted = getTargetedResidents(n);
            return (
              <div
                key={n.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow"
              >
                <div>
                  {/* Category & Status Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <div className="flex items-center gap-2">
                      {n.category === 'manutencao' && (
                        <span className="flex items-center gap-1 text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          <Wrench className="w-3 h-3" /> Manutenção
                        </span>
                      )}
                      {n.category === 'seguranca' && (
                        <span className="flex items-center gap-1 text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          <AlertTriangle className="w-3 h-3" /> Segurança
                        </span>
                      )}
                      {n.category === 'evento' && (
                        <span className="flex items-center gap-1 text-purple-400 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded text-[11px] font-medium">
                          <PartyPopper className="w-3 h-3" /> Evento
                        </span>
                      )}
                      {n.category === 'geral' && (
                        <span className="flex items-center gap-1 text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          <Info className="w-3 h-3" /> Aviso Geral
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                          n.priority === 'urgente'
                            ? 'bg-rose-600 text-white font-bold'
                            : n.priority === 'alta'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'text-slate-400'
                        }`}
                      >
                        Prioridade {n.priority}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Excluir comunicado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug">
                    {n.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
                    {n.content}
                  </p>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Destinatários: <strong className="text-slate-200">{getTargetLabel(n)}</strong> ({targeted.length} moradores com WhatsApp)</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {n.status === 'agendado' ? (
                          <span className="text-amber-300">
                            Agendado para envio em: {n.scheduledFor}
                          </span>
                        ) : (
                          <span>Publicado em: {n.sentAt} por {n.authorName}</span>
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer Dispatches */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Visualizado por {n.readCount} moradores</span>
                  </span>

                  <button
                    onClick={() => setBatchWhatsAppNotice(n)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-lg transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Disparar WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Notice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNotice}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Criar Novo Comunicado / Aviso</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Título do Comunicado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Interrupção temporária de água para manutenção"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="geral">Aviso Geral</option>
                    <option value="manutencao">Manutenção Predial</option>
                    <option value="seguranca">Alerta de Segurança</option>
                    <option value="evento">Evento / Convocação</option>
                    <option value="urgencia">Urgência / Emergência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Prioridade *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as NoticePriority)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média (Padrão)</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Target Segment */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Público-Alvo *</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('todos')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                      targetType === 'todos'
                        ? 'border-emerald-500 bg-emerald-950/40 text-white font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Todos os Moradores
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('bloco')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                      targetType === 'bloco'
                        ? 'border-emerald-500 bg-emerald-950/40 text-white font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Por Bloco / Torre
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('apartamento_especifico')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                      targetType === 'apartamento_especifico'
                        ? 'border-emerald-500 bg-emerald-950/40 text-white font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Apartamento Específico
                  </button>
                </div>

                {targetType === 'bloco' && (
                  <select
                    value={targetBlockId}
                    onChange={(e) => setTargetBlockId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o Bloco...</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                )}

                {targetType === 'apartamento_especifico' && (
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 max-h-36 overflow-y-auto grid grid-cols-4 gap-1.5">
                    {apartments.map((apt) => {
                      const isSel = selectedAptIds.includes(apt.id);
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => {
                            if (isSel) setSelectedAptIds(selectedAptIds.filter((x) => x !== apt.id));
                            else setSelectedAptIds([...selectedAptIds, apt.id]);
                          }}
                          className={`p-1.5 text-center text-xs rounded border transition-colors ${
                            isSel
                              ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          Apt {apt.number}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Conteúdo da Mensagem *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva as orientações, horários, recomendações aos condôminos..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Scheduling & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Agendar Envio Futuro (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Deixe em branco para publicar agora.</p>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="chk-wa"
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="chk-wa" className="text-slate-300 cursor-pointer select-none">
                    Habilitar disparo pelo WhatsApp
                  </label>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Publicar Comunicado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch WhatsApp Dispatcher Drawer / Modal */}
      {batchWhatsAppNotice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Disparar Comunicado via WhatsApp</h3>
              </div>
              <button
                onClick={() => setBatchWhatsAppNotice(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 text-emerald-300 leading-relaxed">
                <strong className="block text-white mb-1 font-semibold">{batchWhatsAppNotice.title}</strong>
                {batchWhatsAppNotice.content}
              </div>

              <div>
                <p className="text-slate-300 font-semibold mb-2">
                  Moradores Selecionados ({getTargetedResidents(batchWhatsAppNotice).length})
                </p>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950 overflow-hidden">
                  {getTargetedResidents(batchWhatsAppNotice).map((r) => {
                    const aptNum = r.apartmentId.replace('apt-', '').toUpperCase();
                    return (
                      <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-slate-900 transition-colors">
                        <div>
                          <p className="font-medium text-white">{r.name}</p>
                          <p className="text-[11px] text-slate-400">Apt {aptNum} · Tel: {r.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const condo = storage.getCondo();
                            const msg = `📢 *COMUNICADO DA PORTARIA - ${condo.name}*\n\n*${batchWhatsAppNotice.title}*\n\n${batchWhatsAppNotice.content}\n\n_Para dúvidas, procure a portaria ou administração._`;
                            openWhatsAppLink(r.phone, msg);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                type="button"
                onClick={() => setBatchWhatsAppNotice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
