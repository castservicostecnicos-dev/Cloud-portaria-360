import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Key,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Resident, Block, Apartment, ResidentInvite } from '../types';
import { WhatsAppPayload } from '../services/whatsapp';

interface ResidentInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedResident?: Resident | null;
  onTriggerWhatsApp?: (payload: WhatsAppPayload) => void;
}

export const ResidentInviteModal: React.FC<ResidentInviteModalProps> = ({
  isOpen,
  onClose,
  preSelectedResident,
  onTriggerWhatsApp,
}) => {
  const condo = storage.getCondo();
  const residents = storage.getResidents();
  const blocks = storage.getBlocks();
  const apartments = storage.getApartments();

  const [selectedResidentId, setSelectedResidentId] = useState<string>(
    preSelectedResident?.id || (residents[0]?.id ?? '')
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<ResidentInvite | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentResident = residents.find((r) => r.id === selectedResidentId) || preSelectedResident;
  const currentApt = apartments.find((a) => a.id === currentResident?.apartmentId);
  const currentBlock = blocks.find((b) => b.id === currentResident?.blockId);
  const allInvites = storage.getResidentInvites();

  const handleGenerateInvite = () => {
    if (!currentResident) return;

    const aptNum = currentApt?.number || currentResident.apartmentId.replace('apt-', '').toUpperCase();
    const blkName = currentBlock?.name || currentBlock?.identification || 'Torre Principal';

    const newInvite = storage.createResidentInvite({
      residentName: currentResident.name,
      phone: currentResident.phone,
      email: currentResident.email,
      apartmentId: currentResident.apartmentId,
      blockId: currentResident.blockId,
      unitNumber: aptNum,
      blockName: blkName,
      residentId: currentResident.id,
      expiresInDays: 14,
    });

    setCreatedInvite(newInvite);
    setSuccessMsg(`Convite gerado com sucesso para ${currentResident.name}!`);
  };

  const getInviteWhatsAppMessage = (invite: ResidentInvite) => {
    return `Olá ${invite.residentName}! 🏢\n\nA portaria do *${invite.condoName || condo.name}* preparou seu convite para o *Aplicativo do Morador* (Apt ${invite.unitNumber} - ${invite.blockName}).\n\nCom o aplicativo exclusivo do morador você pode:\n📅 Visualizar disponibilidade e reservar áreas comuns (churrasqueira, salão, etc.);\n📢 Receber comunicados internos e avisos de encomendas para o seu apartamento;\n📝 Registrar ocorrências no condomínio com fotos.\n\n🔑 *Seu Código de Ativação*: *${invite.code}*\n\nPara acessar, abra o sistema da portaria, selecione *Portal do Morador > Ativar Convite*, insira o código acima e crie sua senha de acesso!\n\n_Válido até ${invite.expiresAt}_`;
  };

  const handleSendWhatsApp = (invite: ResidentInvite) => {
    const text = getInviteWhatsAppMessage(invite);
    if (onTriggerWhatsApp) {
      onTriggerWhatsApp({
        phone: invite.phone,
        residentName: invite.residentName,
        apartmentNumber: invite.unitNumber,
        blockName: invite.blockName,
        customMessage: text,
      });
    } else {
      const cleanPhone = invite.phone.replace(/\D/g, '');
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Convidar Morador para o Aplicativo
              </h3>
              <p className="text-[11px] text-slate-400">
                Gere código de primeiro acesso para o morador cadastrar sua senha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtabs: Novo Convite / Convites Ativos */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Gerar Novo Convite
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Convites Emitidos</span>
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
              {allInvites.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeTab === 'create' ? (
            <div className="space-y-4">
              {/* Resident selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Selecione o Morador / Apartamento</span>
                </label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => {
                    setSelectedResidentId(e.target.value);
                    setCreatedInvite(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {residents.map((r) => {
                    const apt = apartments.find((a) => a.id === r.apartmentId);
                    const blk = blocks.find((b) => b.id === r.blockId);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} - Apt {apt?.number || r.apartmentId.replace('apt-', '').toUpperCase()} ({blk?.name || 'Bloco'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Resident Card Preview */}
              {currentResident && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{currentResident.name}</span>
                    <span className="bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Apt {currentApt?.number || '---'} · {currentBlock?.name || 'Torre'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] pt-1 border-t border-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{currentResident.phone || 'Sem telefone'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{currentResident.email || 'E-mail não cadastrado'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button to Generate */}
              {!createdInvite && (
                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Gerar Código de Convite para o Morador</span>
                </button>
              )}

              {/* Generated Invite Card */}
              {createdInvite && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-950 border border-purple-500/40 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Convite Pronto para Envio
                    </span>
                    <span className="text-[10px] text-slate-400">Validade: 14 dias</span>
                  </div>

                  {/* Big Code Display */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Código de Ativação do Morador:</span>
                      <span className="font-mono text-base font-extrabold text-purple-300 tracking-wider">
                        {createdInvite.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(createdInvite.code)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Actions: Send via WhatsApp or copy full message */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(createdInvite)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getInviteWhatsAppMessage(createdInvite));
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto Completo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Invite List */
            <div className="space-y-2.5">
              {allInvites.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum convite emitido até o momento.
                </div>
              ) : (
                allInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{inv.residentName}</span>
                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded text-[10px]">
                          Apt {inv.unitNumber}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.status === 'aceito'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : inv.status === 'pendente'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {inv.status === 'aceito'
                          ? 'Ativado (Em Uso)'
                          : inv.status === 'pendente'
                          ? 'Aguardando Cadastro'
                          : 'Cancelado/Expirado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <div>
                        Código: <span className="font-mono text-purple-300 font-semibold">{inv.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === 'pendente' && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(inv)}
                            className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Reenviar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(inv.code)}
                          className="text-slate-400 hover:text-white text-[11px]"
                          title="Copiar Código"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            O morador usará este código para definir sua senha pessoal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
