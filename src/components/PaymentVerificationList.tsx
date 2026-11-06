import React, { useState } from 'react';
import { Participant } from '../types';
import { Search, Filter, CheckCircle, XCircle, Eye, Mail, QrCode, Check, FileText } from 'lucide-react';

interface PaymentVerificationListProps {
  participants: Participant[];
  onVerifyPayment: (participantId: string) => void;
  onRejectPayment: (participantId: string) => void;
  onSelectParticipantForTicket: (participant: Participant) => void;
}

export const PaymentVerificationList: React.FC<PaymentVerificationListProps> = ({
  participants,
  onVerifyPayment,
  onRejectPayment,
  onSelectParticipantForTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'checkedIn'>('pending');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.paymentReference && p.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'checkedIn'
        ? p.isCheckedIn
        : p.paymentStatus === statusFilter;

    const matchesTier = tierFilter === 'all' ? true : p.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Verificación Manual de Pagos
          </h2>
          <p className="text-xs text-slate-500">
            Revisa los comprobantes enviados desde el Google Form y genera la entrada con código QR.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pendientes ({participants.filter(p => p.paymentStatus === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
              statusFilter === 'verified'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Verificados
          </button>
          <button
            onClick={() => setStatusFilter('checkedIn')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
              statusFilter === 'checkedIn'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Acreditados
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({participants.length})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o ID de entrada..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-sky-600"
          >
            <option value="all">Todas las Categorías</option>
            <option value="General">General</option>
            <option value="VIP">VIP</option>
            <option value="Speaker">Speaker</option>
            <option value="Estudiante">Estudiante</option>
          </select>
        </div>
      </div>

      {/* Desktop Table & Mobile Card View */}
      
      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-3">
        {filteredParticipants.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 space-y-2">
            <FileText className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">No hay registros en esta vista</p>
          </div>
        ) : (
          filteredParticipants.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{p.fullName}</h4>
                  <p className="text-xs text-slate-600">{p.email}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {p.id}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                  {p.tier}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-500">Monto:</span> <strong className="text-slate-900">${p.paymentAmount}</strong>
                  {p.paymentProofUrl && (
                    <button
                      onClick={() => setSelectedProofUrl(p.paymentProofUrl || null)}
                      className="ml-2 text-sky-700 underline text-[11px]"
                    >
                      Comprobante
                    </button>
                  )}
                </div>

                <div>
                  {p.paymentStatus === 'pending' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                      Pendiente
                    </span>
                  )}
                  {p.paymentStatus === 'verified' && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                      Verificado
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {p.paymentStatus === 'pending' ? (
                  <button
                    onClick={() => onVerifyPayment(p.id)}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg min-h-[40px]"
                  >
                    Verificar & Generar QR
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectParticipantForTicket(p)}
                    className="w-full py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg min-h-[40px] flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="h-4 w-4" /> Ver Gafete QR
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Participante</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Monto & Comprobante</th>
                <th className="py-3.5 px-4">Estado Pago</th>
                <th className="py-3.5 px-4">Entrada QR / Gafete</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No hay registros en esta vista
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900">{p.fullName}</div>
                        <div className="text-[11px] text-slate-500">{p.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {p.id}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {p.tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-mono font-bold text-slate-800">${p.paymentAmount.toFixed(2)}</div>
                        {p.paymentProofUrl ? (
                          <button
                            onClick={() => setSelectedProofUrl(p.paymentProofUrl || null)}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-700 underline font-medium"
                          >
                            <Eye className="h-3 w-3" /> Ver Comprobante
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sin archivo</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.paymentStatus === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                          Pendiente
                        </span>
                      )}
                      {p.paymentStatus === 'verified' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> Verificado
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.paymentStatus === 'verified' ? (
                        <button
                          onClick={() => onSelectParticipantForTicket(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold hover:bg-sky-100"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Ver Gafete
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pendiente de pago</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {p.paymentStatus === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onVerifyPayment(p.id)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all"
                          >
                            Verificar & Enviar QR
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectParticipantForTicket(p)}
                          className="text-xs text-sky-700 hover:underline font-medium flex items-center justify-end gap-1 ml-auto"
                        >
                          <Mail className="h-3.5 w-3.5" /> Re-enviar
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Proof Modal */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <button
              onClick={() => setSelectedProofUrl(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-4">Comprobante de Pago</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={selectedProofUrl}
                alt="Comprobante"
                className="max-h-96 w-auto object-contain rounded-lg"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
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
