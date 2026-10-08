import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Copy, Check, ExternalLink } from 'lucide-react';
import { storage } from '../services/storage';
import { buildWhatsAppMessage, openWhatsAppLink, WhatsAppPayload, sanitizePhoneNumber } from '../services/whatsapp';
import { WhatsAppTemplate } from '../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayload: WhatsAppPayload;
  onSuccess?: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  initialPayload,
  onSuccess,
}) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allTemplates = storage.getWhatsAppTemplates();
      setTemplates(allTemplates);

      // Select default template based on initialPayload
      let defaultTpl = allTemplates[0];
      if (initialPayload.templateKey) {
        const found = allTemplates.find((t) => t.key === initialPayload.templateKey);
        if (found) defaultTpl = found;
      } else if (initialPayload.itemType === 'remedio') {
        const found = allTemplates.find((t) => t.key === 'remedio_urgente');
        if (found) defaultTpl = found;
      } else if (initialPayload.visitorName) {
        const found = allTemplates.find((t) => t.key === 'visitante_aguardando');
        if (found) defaultTpl = found;
      } else if (initialPayload.contractorName) {
        const found = allTemplates.find((t) => t.key === 'prestador_aguardando');
        if (found) defaultTpl = found;
      }

      setSelectedTemplateId(defaultTpl?.id || '');
      setPhoneNumber(initialPayload.phone || '');

      if (defaultTpl) {
        const generated = buildWhatsAppMessage(defaultTpl.templateText, initialPayload);
        setMessageText(generated);
      }
    }
  }, [isOpen, initialPayload]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      const generated = buildWhatsAppMessage(tpl.templateText, {
        ...initialPayload,
        phone: phoneNumber,
      });
      setMessageText(generated);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!phoneNumber) {
      alert('Por favor informe o número de WhatsApp do morador.');
      return;
    }
    openWhatsAppLink(phoneNumber, messageText);
    storage.addAuditLog(
      'Notificação WhatsApp',
      'Comunicação',
      `Mensagem enviada para ${initialPayload.residentName} (${phoneNumber}): "${messageText.slice(0, 60)}..."`
    );
    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Notificação por WhatsApp</h3>
              <p className="text-xs text-slate-400">
                {initialPayload.residentName} {initialPayload.apartmentNumber ? `· Apt ${initialPayload.apartmentNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Modelo de Mensagem
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Telefone / WhatsApp do Destinatário
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ex: (11) 98111-2233 ou 5511981112233"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono-tabular"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              DDI 55 inserido automaticamente se omitido. Destino: {sanitizePhoneNumber(phoneNumber) || '---'}
            </p>
          </div>

          {/* Message Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Texto da Mensagem (Editável)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-none shadow-inner"
            />
          </div>

          {/* Quick Notice */}
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 text-[11px] text-emerald-300 flex items-start gap-2">
            <span className="text-sm">💬</span>
            <span>
              Ao clicar no botão verde, uma nova guia será aberta no WhatsApp Web ou App com a conversa do morador já pronta para envio.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Abrir e Enviar no WhatsApp</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
