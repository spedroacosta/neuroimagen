import React, { useState } from 'react';
import { Participant, TicketTier } from '../types';
import { UserPlus, X } from 'lucide-react';

interface NewParticipantModalProps {
  onClose: () => void;
  onAddParticipant: (participant: Omit<Participant, 'id' | 'registeredAt' | 'paymentStatus' | 'isCheckedIn'>) => void;
  onImportBatch: (rawCsv: string) => void;
}

export const NewParticipantModal: React.FC<NewParticipantModalProps> = ({
  onClose,
  onAddParticipant,
  onImportBatch,
}) => {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<TicketTier>('General');
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [batchCsv, setBatchCsv] = useState('');

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    onAddParticipant({
      fullName,
      email,
      phone: phone || '',
      tier,
      paymentAmount: Number(amount) || 0,
      paymentReference: reference || `FORM-${Math.floor(Math.random() * 89999 + 10000)}`,
    });

    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCsv.trim()) return;
    onImportBatch(batchCsv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 text-sky-800 rounded-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Agregar Asistente al Taller</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`flex-1 py-2 rounded transition-all ${
              tab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Registro Individual
          </button>
          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`flex-1 py-2 rounded transition-all ${
              tab === 'batch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Pegar desde Google Sheets
          </button>
        </div>

        {tab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-700 font-semibold mb-1 block">Nombre Completo:</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Carlos Mendoza"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-600 min-h-[38px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold mb-1 block">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@medicina.edu"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-600 min-h-[38px]"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold mb-1 block">Teléfono (opcional):</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-600 min-h-[38px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 min-h-[38px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow-sm min-h-[38px]"
              >
                Guardar Registro
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBatchSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Pega aquí las filas copiadas desde tu hoja de Google Sheets (formato: Nombre, Correo):
            </p>

            <textarea
              rows={6}
              value={batchCsv}
              onChange={(e) => setBatchCsv(e.target.value)}
              placeholder={`Dra. Laura Castro, laura@medicina.edu\nDr. Jorge Ortiz, jorge@medicina.edu`}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-600"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 min-h-[38px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow-sm min-h-[38px]"
              >
                Importar Registros
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
