import React, { useState } from 'react';
import { Participant } from '../types';
import { ensureAccessToken } from '../utils/googleAuth';
import { extractSequentialId, getSequentialTicketId } from '../utils/qr';
import {
  Search,
  Eye,
  Mail,
  QrCode,
  Check,
  FileText,
  FileImage,
  ExternalLink,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ListChecks,
  Trash2,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { SmtpConfig } from '../utils/emailService';

interface PaymentVerificationListProps {
  participants: Participant[];
  processingParticipantId: string | null;
  onRequestVerifyAndSend: (participant: Participant) => void;
  onRejectPayment: (participantId: string) => void;
  onRevertVerifiedPayment: (participant: Participant) => void;
  onDeleteParticipant: (participant: Participant) => void;
  onSelectParticipantForTicket: (participant: Participant) => void;
}

export const PaymentVerificationList: React.FC<PaymentVerificationListProps> = ({
  participants,
  processingParticipantId,
  onRequestVerifyAndSend,
  onRejectPayment,
  onRevertVerifiedPayment,
  onDeleteParticipant,
  onSelectParticipantForTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'verified' | 'rejected' | 'checkedIn'
  >('pending');
  const [selectedProof, setSelectedProof] = useState<{
    fileId?: string;
    url?: string;
    ref?: string;
    name: string;
    rawAnswersJson?: string;
  } | null>(null);
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [confirmVerifyTarget, setConfirmVerifyTarget] = useState<Participant | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Participant | null>(null);
  const [showSmtpPanel, setShowSmtpPanel] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const saved = localStorage.getItem('neuroimagen_smtp');
    return saved
      ? JSON.parse(saved)
      : {
          host: 'smtp.gmail.com',
          port: 587,
          user: '',
          pass: '',
          senderName: 'Promoción 106 de Médicos Cirujanos',
        };
  });

  const handleSaveSmtp = (updated: SmtpConfig) => {
    setSmtpConfig(updated);
    localStorage.setItem('neuroimagen_smtp', JSON.stringify(updated));
  };

  const filteredParticipants = participants.filter((p) => {
    const q = searchTerm.toLowerCase();
    const seqId =
      p.paymentStatus === 'verified' ? getSequentialTicketId(p, participants) : extractSequentialId(p) || '';
    const matchesSearch =
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      seqId.toLowerCase().includes(q) ||
      (p.paymentReference && p.paymentReference.toLowerCase().includes(q)) ||
      (p.cedula && p.cedula.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'checkedIn'
        ? p.isCheckedIn
        : p.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenProofModal = async (p: Participant) => {
    setSelectedProof({
      fileId: p.paymentProofFileId,
      url: p.paymentProofUrl,
      ref: p.paymentReference,
      name: p.fullName,
      rawAnswersJson: p.rawAnswersJson,
    });
    setProofBlobUrl(null);
    setProofError(null);

    if (p.paymentProofFileId) {
      setLoadingProof(true);
      try {
        const token = await ensureAccessToken();
        const res = await fetch(`/api/drive-file/${encodeURIComponent(p.paymentProofFileId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(
            errJson.error || `Error ${res.status} al descargar el archivo de Google Drive.`
          );
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setProofBlobUrl(objectUrl);
      } catch (err: any) {
        console.error('Error loading Drive receipt:', err);
        setProofError(
          err.message || 'No se pudo cargar la imagen del comprobante desde Google Drive.'
        );
      } finally {
        setLoadingProof(false);
      }
    } else if (p.paymentProofUrl) {
      setProofBlobUrl(p.paymentProofUrl);
    }
  };

  const handleCloseProofModal = () => {
    if (proofBlobUrl && proofBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(proofBlobUrl);
    }
    setSelectedProof(null);
    setProofBlobUrl(null);
    setProofError(null);
  };

  const nextIdForConfirmTarget = confirmVerifyTarget
    ? getSequentialTicketId(confirmVerifyTarget, participants)
    : '001';

  return (
    <div className="space-y-6 bg-white">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Verificación Manual de Pagos</h2>
          <p className="text-xs text-slate-600">
            Revisa el número de comprobante y la imagen subida en el Google Form. Al verificar, se
            asigna el ID secuencial (001, 002...), se crea la diapositiva en Google Slides y se envía
            por correo.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] border ${
              statusFilter === 'pending'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pendientes ({participants.filter((p) => p.paymentStatus === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] border ${
              statusFilter === 'verified'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Verificados ({participants.filter((p) => p.paymentStatus === 'verified').length})
          </button>
          <button
            onClick={() => setStatusFilter('checkedIn')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] border ${
              statusFilter === 'checkedIn'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            En el Evento ({participants.filter((p) => p.isCheckedIn).length})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] border ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({participants.length})
          </button>
          <button
            onClick={() => setShowSmtpPanel(!showSmtpPanel)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] border flex items-center gap-1.5 ${
              smtpConfig.user && smtpConfig.pass
                ? 'bg-sky-50 text-sky-900 border-sky-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            {smtpConfig.user && smtpConfig.pass
              ? `SMTP: ${smtpConfig.user}`
              : 'Configurar Correo / SMTP'}
          </button>
        </div>
      </div>

      {/* Optional SMTP Configuration Panel */}
      {showSmtpPanel && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Cuenta Remitente para Envío de Correos (Gmail Directo o Contraseña de Aplicación SMTP)
              </h3>
              <p className="text-slate-600 mt-0.5">
                Si dejas el Usuario y Contraseña vacíos, los correos se enviarán automáticamente desde la cuenta de Google con la que iniciaste sesión arriba. Si deseas forzar el envío por SMTP desde un correo específico (ej. <strong>promo106udoanz@gmail.com</strong>), ingresa el correo y su Contraseña de Aplicación de Google (16 letras).
              </p>
            </div>
            {smtpConfig.user && (
              <button
                onClick={() =>
                  handleSaveSmtp({
                    host: 'smtp.gmail.com',
                    port: 587,
                    user: '',
                    pass: '',
                    senderName: 'Promoción 106 de Médicos Cirujanos',
                  })
                }
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg font-bold whitespace-nowrap"
              >
                Usar Gmail Conectado (Limpiar SMTP)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">
                Correo Remitente (Usuario SMTP):
              </label>
              <input
                type="email"
                value={smtpConfig.user}
                onChange={(e) => handleSaveSmtp({ ...smtpConfig, user: e.target.value })}
                placeholder="promo106udoanz@gmail.com"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">
                Contraseña de Aplicación (16 letras):
              </label>
              <input
                type="password"
                value={smtpConfig.pass}
                onChange={(e) => handleSaveSmtp({ ...smtpConfig, pass: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">
                Servidor SMTP (Por defecto Gmail):
              </label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={(e) => handleSaveSmtp({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Puerto:</label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={(e) =>
                  handleSaveSmtp({ ...smtpConfig, port: Number(e.target.value) || 587 })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por ID (001, 002...), nombre, correo, cédula o número de comprobante..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 min-h-[42px]"
        />
      </div>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-3">
        {filteredParticipants.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 space-y-2">
            <FileText className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">No hay registros en esta vista</p>
          </div>
        ) : (
          filteredParticipants.map((p) => {
            const isProcessing = processingParticipantId === p.id;
            const displayId =
              p.paymentStatus === 'verified'
                ? `ID: ${getSequentialTicketId(p, participants)}`
                : 'ID: Se asigna al verificar';
            return (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.fullName}</h4>
                    <p className="text-xs text-slate-600">{p.email}</p>
                    {p.phone && <p className="text-xs text-slate-500">Tel: {p.phone}</p>}
                    {p.cedula && <p className="text-xs text-slate-500">Cédula/Doc: {p.cedula}</p>}
                    <p className="text-[11px] font-mono font-bold text-sky-900 mt-0.5">
                      {displayId}
                    </p>
                  </div>
                  {p.paymentStatus === 'pending' && (
                    <span className="px-2 py-0.5 bg-white text-amber-800 border border-amber-300 font-bold text-[10px] rounded">
                      Pendiente
                    </span>
                  )}
                  {p.paymentStatus === 'verified' && (
                    <span className="px-2 py-0.5 bg-white text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded">
                      Verificado ({getSequentialTicketId(p, participants)})
                    </span>
                  )}
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Nº Comprobante de pago:</span>
                    <strong className="font-mono text-slate-900">
                      {p.paymentReference || 'No especificado'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-semibold">Comprobante y Respuestas:</span>
                    <button
                      onClick={() => handleOpenProofModal(p)}
                      className="flex items-center gap-1 text-sky-700 font-bold underline text-xs min-h-[32px]"
                    >
                      <Eye className="h-3.5 w-3.5" />{' '}
                      {p.paymentProofFileId || p.paymentProofUrl
                        ? 'Ver Imagen Adjunta'
                        : 'Ver Respuestas'}
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  {p.paymentStatus === 'pending' ? (
                    <>
                      <button
                        onClick={() => setConfirmVerifyTarget(p)}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg min-h-[42px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Creando Slide y Enviando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Verificar y Enviar Pase QR
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTarget(p)}
                        disabled={isProcessing}
                        className="px-3 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 rounded-lg min-h-[42px]"
                        title="Rechazar o Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectParticipantForTicket(p)}
                        className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg min-h-[42px] flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="h-4 w-4" /> Ver Pase (ID:{' '}
                        {getSequentialTicketId(p, participants)}) / Reenviar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTarget(p)}
                        disabled={isProcessing}
                        className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg min-h-[42px] flex items-center justify-center gap-1 font-bold text-xs"
                        title="Eliminar pago verificado o registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">ID Entrada</th>
                <th className="py-3.5 px-4">Participante</th>
                <th className="py-3.5 px-4">Nº de Comprobante de Pago</th>
                <th className="py-3.5 px-4">Imagen del Comprobante (Forms)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No hay participantes registrados en este filtro.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isProcessing = processingParticipantId === p.id;
                  const seqId =
                    p.paymentStatus === 'verified'
                      ? getSequentialTicketId(p, participants)
                      : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        {seqId ? (
                          <span className="px-2.5 py-1 bg-white text-slate-900 font-bold border border-slate-300 rounded-md inline-block">
                            {seqId}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Por asignar</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.fullName}</div>
                        <div className="text-[11px] text-slate-600">{p.email}</div>
                        {(p.phone || p.cedula) && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {p.phone ? `Tel: ${p.phone}` : ''}{' '}
                            {p.cedula ? `• Doc: ${p.cedula}` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2.5 py-1 bg-white rounded border border-slate-300 inline-block">
                          {p.paymentReference || 'Sin número'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.paymentProofFileId || p.paymentProofUrl ? (
                          <button
                            onClick={() => handleOpenProofModal(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-sky-800 border border-sky-300 rounded-lg text-xs font-semibold hover:bg-sky-50"
                          >
                            <FileImage className="h-3.5 w-3.5 text-sky-700" /> Ver Comprobante Subido
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenProofModal(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50"
                          >
                            <ListChecks className="h-3.5 w-3.5 text-slate-500" /> Ver Respuestas del
                            Form
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.paymentStatus === 'pending' && (
                          <span className="px-2.5 py-1 rounded border border-amber-300 bg-white text-amber-800 text-[11px] font-bold">
                            Pendiente
                          </span>
                        )}
                        {p.paymentStatus === 'verified' && (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded border border-emerald-300 bg-white text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                              <Check className="h-3 w-3" /> Verificado
                            </span>
                            {p.ticketSentAt && (
                              <div className="text-[10px] text-slate-500">
                                Enviado: {p.ticketSentAt}
                              </div>
                            )}
                          </div>
                        )}
                        {p.paymentStatus === 'rejected' && (
                          <span className="px-2.5 py-1 rounded border border-rose-300 bg-white text-rose-800 text-[11px] font-bold">
                            Rechazado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {p.paymentStatus === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setConfirmVerifyTarget(p)}
                              disabled={isProcessing}
                              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creando Slide y
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Verificar y Enviar Correo
                                  con QR
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTarget(p)}
                              disabled={isProcessing}
                              className="p-2 text-slate-400 hover:text-rose-700 rounded-lg border border-slate-200 hover:border-rose-300"
                              title="Rechazar o eliminar registro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectParticipantForTicket(p)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <QrCode className="h-3.5 w-3.5 text-sky-700" />
                              Ver Pase (ID: {seqId}) / Reenviar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTarget(p)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                              title="Eliminar pago verificado o participante"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog before Mutating Data & Sending Email */}
      {confirmVerifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirmar Verificación y Creación de Diapositiva (ID: {nextIdForConfirmTarget})
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Al confirmar, la aplicación realizará automáticamente estas 3 acciones:
            </p>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              <li>
                Asignará el <strong>ID: {nextIdForConfirmTarget}</strong> y marcará como{' '}
                <strong>Verificado</strong> el pago de{' '}
                <strong>{confirmVerifyTarget.fullName}</strong> (Comprobante:{' '}
                <span className="font-mono">
                  {confirmVerifyTarget.paymentReference || 'N/A'}
                </span>
                ).
              </li>
              <li>
                Creará una nueva diapositiva para este participante dentro de tu presentación de{' '}
                <strong>Google Slides</strong> rellenando su Nombre, Correo,{' '}
                <strong>ID ({nextIdForConfirmTarget})</strong> y su código QR en el recuadro gris.
              </li>
              <li>
                Enviará el correo de confirmación con el pase adjunto a{' '}
                <strong>{confirmVerifyTarget.email}</strong> a través de Gmail.
              </li>
            </ul>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmVerifyTarget(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg min-h-[38px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const target = confirmVerifyTarget;
                  setConfirmVerifyTarget(null);
                  onRequestVerifyAndSend(target);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg min-h-[38px] flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" /> Confirmar y Enviar (ID: {nextIdForConfirmTarget})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Revert Verified Payment or Delete Participant Completely */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Gestionar o Eliminar Pago / Registro
              </h3>
              <button
                onClick={() => setConfirmDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">{confirmDeleteTarget.fullName}</div>
              <div className="text-slate-600">{confirmDeleteTarget.email}</div>
              <div className="font-mono text-slate-700">
                Comprobante: {confirmDeleteTarget.paymentReference || 'Sin número'}
                {confirmDeleteTarget.paymentStatus === 'verified' &&
                  ` • ID Asignado: ${getSequentialTicketId(confirmDeleteTarget, participants)}`}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {confirmDeleteTarget.paymentStatus === 'verified' && (
                <button
                  onClick={() => {
                    const target = confirmDeleteTarget;
                    setConfirmDeleteTarget(null);
                    onRevertVerifiedPayment(target);
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[42px]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Anular Pago Verificado (Volver a Pendiente y borrar su Slide)
                </button>
              )}

              {confirmDeleteTarget.paymentStatus === 'pending' && (
                <button
                  onClick={() => {
                    const targetId = confirmDeleteTarget.id;
                    setConfirmDeleteTarget(null);
                    onRejectPayment(targetId);
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[42px]"
                >
                  <XCircle className="h-4 w-4" />
                  Marcar Pago como Rechazado
                </button>
              )}

              <button
                onClick={() => {
                  const target = confirmDeleteTarget;
                  setConfirmDeleteTarget(null);
                  onDeleteParticipant(target);
                }}
                className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[42px]"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Integrante por Completo (Base de Datos y Slide)
              </button>

              <button
                onClick={() => setConfirmDeleteTarget(null)}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl min-h-[38px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof & Form Answers Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseProofModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Comprobante de Pago y Respuestas del Formulario
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {selectedProof.name} •{' '}
                <span className="font-mono font-bold text-slate-900">
                  Comprobante Nº: {selectedProof.ref || 'Sin número'}
                </span>
              </p>
            </div>

            {selectedProof.fileId || selectedProof.url ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3 text-center">
                {loadingProof && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
                    <RefreshCw className="h-6 w-6 animate-spin text-sky-700" />
                    <span>Descargando imagen del comprobante desde Google Drive...</span>
                  </div>
                )}

                {proofError && (
                  <div className="p-4 text-xs text-rose-700 border border-rose-200 rounded-lg">
                    {proofError}
                  </div>
                )}

                {proofBlobUrl && !loadingProof && (
                  <img
                    src={proofBlobUrl}
                    alt="Comprobante de Pago"
                    className="max-h-96 w-auto mx-auto object-contain rounded-lg border border-slate-200"
                  />
                )}

                {selectedProof.fileId && (
                  <a
                    href={`https://drive.google.com/file/d/${selectedProof.fileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-sky-700 font-bold hover:underline py-1"
                  >
                    Abrir archivo original en Google Drive <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                Este registro no tiene un archivo de imagen adjunto en Google Drive.
              </div>
            )}

            {selectedProof.rawAnswersJson && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Todas las respuestas enviadas en el Google Form:
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs">
                  {Object.entries(
                    (() => {
                      try {
                        return JSON.parse(selectedProof.rawAnswersJson || '{}');
                      } catch {
                        return {};
                      }
                    })()
                  ).map(([question, answer]) => (
                    <div
                      key={question}
                      className="p-2.5 flex flex-col sm:flex-row sm:justify-between gap-1"
                    >
                      <span className="font-semibold text-slate-600">{question}:</span>
                      <span className="text-slate-900 font-medium sm:text-right">
                        {String(answer)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCloseProofModal}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
