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
  X,
} from 'lucide-react';
import { SmtpConfig } from '../utils/emailService';
import { Dialog } from './Dialog';

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

  const FILTERS: { id: FilterId; label: string; count: number }[] = [
    { id: 'pending', label: 'Pendientes', count: participants.filter((p) => p.paymentStatus === 'pending').length },
    { id: 'verified', label: 'Verificados', count: participants.filter((p) => p.paymentStatus === 'verified').length },
    { id: 'checkedIn', label: 'En el evento', count: participants.filter((p) => p.isCheckedIn).length },
    { id: 'all', label: 'Todos', count: participants.length },
  ];

  const smtpActive = Boolean(smtpConfig.user && smtpConfig.pass);

  // Acción principal + eliminar, reutilizada en tarjetas (móvil) y tabla (escritorio)
  const renderActions = (p: Participant, fullWidth: boolean) => {
    const isProcessing = processingParticipantId === p.id;
    const wrap = fullWidth ? 'flex w-full gap-2' : 'flex items-center justify-end gap-2';

    if (p.paymentStatus === 'pending') {
      return (
        <div className={wrap}>
          <button
            onClick={() => setConfirmVerifyTarget(p)}
            disabled={isProcessing}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 ${
              fullWidth ? 'flex-1' : ''
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Creando diapositiva…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Verificar y enviar QR
              </>
            )}
          </button>
          <button
            onClick={() => setConfirmDeleteTarget(p)}
            disabled={isProcessing}
            title="Rechazar o eliminar registro"
            aria-label="Rechazar o eliminar registro"
            className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className={wrap}>
        <button
          onClick={() => onSelectParticipantForTicket(p)}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 ${
            fullWidth ? 'flex-1' : ''
          }`}
        >
          <QrCode className="h-4 w-4 text-brand-700" aria-hidden="true" />
          Ver pase (ID {getSequentialTicketId(p, participants)})
        </button>
        <button
          onClick={() => setConfirmDeleteTarget(p)}
          disabled={isProcessing}
          title="Eliminar pago verificado o participante"
          aria-label="Eliminar pago verificado o participante"
          className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-rose-200 bg-white text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const StatusBadge: React.FC<{ status: Participant['paymentStatus'] }> = ({ status }) => {
    const map = {
      pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
      verified: { label: 'Verificado', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
      rejected: { label: 'Rechazado', cls: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
    } as const;
    const s = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
        {s.label}
      </span>
    );
  };

  const hasProof = (p: Participant) => Boolean(p.paymentProofFileId || p.paymentProofUrl);

  return (
    <div className="space-y-5">
      {/* Cabecera y filtros */}
      <section className="card space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Verificación de pagos</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Revisa el número de comprobante y la imagen del Google Form. Al verificar se asigna el ID secuencial, se
              crea la diapositiva en Google Slides y se envía el pase por correo.
            </p>
          </div>

          <button
            onClick={() => setShowSmtpPanel(!showSmtpPanel)}
            aria-expanded={showSmtpPanel}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              smtpActive
                ? 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            {smtpActive ? `Correo: ${smtpConfig.user}` : 'Configurar correo (SMTP)'}
          </button>
        </div>

        {/* Segmentos de estado */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
                <span
                  className={`rounded-md px-1.5 text-xs font-bold tabular-nums ${
                    active ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID, nombre, correo, cédula o comprobante…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </section>

      {/* Panel SMTP (opcional) */}
      {showSmtpPanel && (
        <section className="card space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Cuenta remitente para los correos</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Si dejas usuario y contraseña vacíos, los correos se envían desde la cuenta de Google con la que iniciaste
                sesión. Para forzar un remitente específico (por ejemplo <strong>promo106udoanz@gmail.com</strong>),
                ingresa su correo y una contraseña de aplicación de Google (16 caracteres).
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
                className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Usar Gmail conectado
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Correo remitente',
                type: 'email',
                value: smtpConfig.user,
                placeholder: 'promo106udoanz@gmail.com',
                onChange: (v: string) => handleSaveSmtp({ ...smtpConfig, user: v }),
              },
              {
                label: 'Contraseña de aplicación',
                type: 'password',
                value: smtpConfig.pass,
                placeholder: 'xxxx xxxx xxxx xxxx',
                onChange: (v: string) => handleSaveSmtp({ ...smtpConfig, pass: v }),
              },
              {
                label: 'Servidor SMTP',
                type: 'text',
                value: smtpConfig.host,
                placeholder: 'smtp.gmail.com',
                onChange: (v: string) => handleSaveSmtp({ ...smtpConfig, host: v }),
              },
              {
                label: 'Puerto',
                type: 'number',
                value: String(smtpConfig.port),
                placeholder: '587',
                onChange: (v: string) => handleSaveSmtp({ ...smtpConfig, port: Number(v) || 587 }),
              },
            ].map((field) => (
              <label key={field.label} className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">{field.label}</span>
                <input
                  type={field.type}
                  value={field.value}
                  placeholder={field.placeholder}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Vista móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {filteredParticipants.length === 0 ? (
          <EmptyState />
        ) : (
          filteredParticipants.map((p) => (
            <article key={p.id} className="card space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-slate-900">{p.fullName}</h4>
                  <p className="truncate text-xs text-slate-600">{p.email}</p>
                  {(p.phone || p.cedula) && (
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {p.phone ? `Tel ${p.phone}` : ''} {p.cedula ? `· Doc ${p.cedula}` : ''}
                    </p>
                  )}
                </div>
                <StatusBadge status={p.paymentStatus} />
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                  <p className="text-slate-500">ID de entrada</p>
                  <p className="mt-0.5 font-mono font-bold text-slate-900">
                    {p.paymentStatus === 'verified' ? getSequentialTicketId(p, participants) : 'Por asignar'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Comprobante</p>
                  <p className="mt-0.5 truncate font-mono font-bold text-slate-900">
                    {p.paymentReference || 'Sin número'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenProofModal(p)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {hasProof(p) ? <FileImage className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                {hasProof(p) ? 'Ver comprobante adjunto' : 'Ver respuestas del formulario'}
              </button>

              {renderActions(p, true)}
            </article>
          ))
        )}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50/70">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Participante</th>
                <th className="px-5 py-3">Comprobante</th>
                <th className="px-5 py-3">Respaldo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const seqId = p.paymentStatus === 'verified' ? getSequentialTicketId(p, participants) : null;
                  return (
                    <tr key={p.id} className="align-middle transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        {seqId ? (
                          <span className="inline-block rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                            {seqId}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Por asignar</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{p.fullName}</p>
                        <p className="text-xs text-slate-600">{p.email}</p>
                        {(p.phone || p.cedula) && (
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                            {p.phone ? `Tel ${p.phone}` : ''} {p.cedula ? `· Doc ${p.cedula}` : ''}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {p.paymentReference || 'Sin número'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleOpenProofModal(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {hasProof(p) ? (
                            <FileImage className="h-3.5 w-3.5 text-brand-700" />
                          ) : (
                            <ListChecks className="h-3.5 w-3.5 text-slate-500" />
                          )}
                          {hasProof(p) ? 'Ver comprobante' : 'Ver respuestas'}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={p.paymentStatus} />
                        {p.paymentStatus === 'verified' && p.ticketSentAt && (
                          <p className="mt-1 text-[11px] text-slate-500">Enviado: {p.ticketSentAt}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">{renderActions(p, false)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmación antes de verificar */}
      {confirmVerifyTarget && (
        <Dialog title={`Confirmar verificación · ID ${nextIdForConfirmTarget}`} onClose={() => setConfirmVerifyTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Al confirmar, la aplicación realizará estas tres acciones:</p>
            <ol className="space-y-2.5 text-sm text-slate-700">
              {[
                <>
                  Asignará el <strong>ID {nextIdForConfirmTarget}</strong> y marcará como <strong>verificado</strong> el
                  pago de <strong>{confirmVerifyTarget.fullName}</strong> (comprobante{' '}
                  <span className="font-mono">{confirmVerifyTarget.paymentReference || 'N/A'}</span>).
                </>,
                <>
                  Creará su diapositiva en Google Slides con nombre, correo, <strong>ID {nextIdForConfirmTarget}</strong> y
                  código QR.
                </>,
                <>
                  Enviará el correo con el pase adjunto a <strong>{confirmVerifyTarget.email}</strong> desde Gmail.
                </>,
              ].map((content, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{content}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setConfirmVerifyTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const target = confirmVerifyTarget;
                  setConfirmVerifyTarget(null);
                  onRequestVerifyAndSend(target);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Confirmar y enviar
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Gestionar / eliminar */}
      {confirmDeleteTarget && (
        <Dialog title="Gestionar pago o registro" onClose={() => setConfirmDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="space-y-1 rounded-xl bg-slate-50 p-3.5 text-sm">
              <p className="font-semibold text-slate-900">{confirmDeleteTarget.fullName}</p>
              <p className="text-xs text-slate-600">{confirmDeleteTarget.email}</p>
              <p className="pt-1 font-mono text-xs text-slate-700">
                Comprobante: {confirmDeleteTarget.paymentReference || 'Sin número'}
                {confirmDeleteTarget.paymentStatus === 'verified' &&
                  ` · ID ${getSequentialTicketId(confirmDeleteTarget, participants)}`}
              </p>
            </div>

            <div className="space-y-2.5">
              {confirmDeleteTarget.paymentStatus === 'verified' && (
                <button
                  onClick={() => {
                    const target = confirmDeleteTarget;
                    setConfirmDeleteTarget(null);
                    onRevertVerifiedPayment(target);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Anular pago (volver a pendiente y borrar diapositiva)
                </button>
              )}

              {confirmDeleteTarget.paymentStatus === 'pending' && (
                <button
                  onClick={() => {
                    const targetId = confirmDeleteTarget.id;
                    setConfirmDeleteTarget(null);
                    onRejectPayment(targetId);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Marcar pago como rechazado
                </button>
              )}

              <button
                onClick={() => {
                  const target = confirmDeleteTarget;
                  setConfirmDeleteTarget(null);
                  onDeleteParticipant(target);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar participante (base de datos y diapositiva)
              </button>

              <button
                onClick={() => setConfirmDeleteTarget(null)}
                className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Comprobante y respuestas del formulario */}
      {selectedProof && (
        <Dialog
          title="Comprobante y respuestas del formulario"
          onClose={handleCloseProofModal}
          size="lg"
        >
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{selectedProof.name}</p>
              <p className="font-mono text-xs text-slate-600">
                Comprobante Nº {selectedProof.ref || 'Sin número'}
              </p>
            </div>

            {selectedProof.fileId || selectedProof.url ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                {loadingProof && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-xs text-slate-600">
                    <RefreshCw className="h-6 w-6 animate-spin text-brand-700" />
                    <span>Descargando comprobante desde Google Drive…</span>
                  </div>
                )}

                {proofError && (
                  <div className="rounded-lg border border-rose-200 bg-white p-4 text-xs text-rose-700">{proofError}</div>
                )}

                {proofBlobUrl && !loadingProof && (
                  <img
                    src={proofBlobUrl}
                    alt="Comprobante de pago"
                    className="mx-auto max-h-96 w-auto rounded-lg border border-slate-200 bg-white object-contain"
                  />
                )}

                {selectedProof.fileId && (
                  <a
                    href={`https://drive.google.com/file/d/${selectedProof.fileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Abrir archivo original en Google Drive <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                Este registro no tiene imagen adjunta.
              </div>
            )}

            {selectedProof.rawAnswersJson && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Respuestas del formulario</h4>
                <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 text-sm">
                  {Object.entries(
                    (() => {
                      try {
                        return JSON.parse(selectedProof.rawAnswersJson || '{}');
                      } catch {
                        return {};
                      }
                    })()
                  ).map(([question, answer]) => (
                    <div key={question} className="flex flex-col gap-1 p-3 sm:flex-row sm:justify-between sm:gap-6">
                      <dt className="text-xs font-semibold text-slate-600">{question}</dt>
                      <dd className="font-medium text-slate-900 sm:text-right">{String(answer)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleCloseProofModal}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

type FilterId = 'all' | 'pending' | 'verified' | 'checkedIn';

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500">
      <FileText className="h-5 w-5" aria-hidden="true" />
    </span>
    <p className="text-sm font-semibold text-slate-800">No hay registros en esta vista</p>
    <p className="text-xs text-slate-500">Prueba con otro filtro o término de búsqueda.</p>
  </div>
);
