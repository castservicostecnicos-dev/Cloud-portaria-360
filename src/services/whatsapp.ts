import { storage } from './storage';
import { WhatsAppTemplate } from '../types';

export interface WhatsAppPayload {
  phone: string;
  residentName: string;
  apartmentNumber?: string;
  blockName?: string;
  itemType?: string;
  code?: string;
  description?: string;
  date?: string;
  time?: string;
  visitorName?: string;
  contractorName?: string;
  company?: string;
  reason?: string;
  pickedUpBy?: string;
  customMessage?: string;
  templateKey?: string;
}

export function sanitizePhoneNumber(phone: string): string {
  // Strip non-numeric
  let digits = phone.replace(/\D/g, '');
  
  // If it's a Brazilian phone without country code (10 or 11 digits), prepend 55
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppMessage(templateText: string, data: WhatsAppPayload): string {
  const condo = storage.getCondo();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const currentDate = data.date || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const currentTime = data.time || `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  let text = templateText;
  text = text.replace(/\[CONDOMINIO\]/g, condo.name || 'Condomínio');
  text = text.replace(/\[NOME\]/g, data.residentName || 'Morador(a)');
  text = text.replace(/\[APARTAMENTO\]/g, data.apartmentNumber || '---');
  text = text.replace(/\[BLOCO\]/g, data.blockName || 'Torre');
  text = text.replace(/\[TIPO\]/g, data.itemType || 'Item/Encomenda');
  text = text.replace(/\[CODIGO\]/g, data.code || '');
  text = text.replace(/\[DESCRICAO\]/g, data.description || '');
  text = text.replace(/\[DATA\]/g, currentDate);
  text = text.replace(/\[HORA\]/g, currentTime);
  text = text.replace(/\[VISITANTE_NOME\]/g, data.visitorName || '');
  text = text.replace(/\[PRESTADOR_NOME\]/g, data.contractorName || '');
  text = text.replace(/\[EMPRESA\]/g, data.company || 'Empresa');
  text = text.replace(/\[MOTIVO\]/g, data.reason || '');
  text = text.replace(/\[QUEM_RETIROU\]/g, data.pickedUpBy || 'Morador');
  text = text.replace(/\[MENSAGEM\]/g, data.customMessage || '');

  return text;
}

export function getTemplateByKey(key: string): WhatsAppTemplate | undefined {
  const templates = storage.getWhatsAppTemplates();
  return templates.find((t) => t.key === key) || templates[0];
}

export function openWhatsAppLink(phone: string, message: string) {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
  
  // Try opening WhatsApp directly
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    // If pop-up was blocked or in iframe, fallback to anchor tag
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
