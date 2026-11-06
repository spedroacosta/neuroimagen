/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Participant, EventConfig, Stats } from './types';
import { INITIAL_EVENT_CONFIG } from './utils/sampleData';
import { googleSignIn } from './utils/googleAuth';
import { fetchLiveFormResponses } from './utils/googleFormsApi';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { PaymentVerificationList } from './components/PaymentVerificationList';
import { TicketTemplateDesigner } from './components/TicketTemplateDesigner';
import { TicketModal } from './components/TicketModal';
import { QRScannerView } from './components/QRScannerView';
import { IntegrationGuide } from './components/IntegrationGuide';
import { NewParticipantModal } from './components/NewParticipantModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'verification' | 'template' | 'scanner' | 'guide'>('dashboard');
  
  // Real participant data store
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('neuroimagen_participants');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<EventConfig>(() => {
    const saved = localStorage.getItem('neuroimagen_config');
    return saved ? JSON.parse(saved) : INITIAL_EVENT_CONFIG;
  });

  const [selectedParticipantForTicket, setSelectedParticipantForTicket] = useState<Participant | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('neuroimagen_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('neuroimagen_config', JSON.stringify(config));
  }, [config]);

  // Stats calculations
  const pendingCount = participants.filter((p) => p.paymentStatus === 'pending').length;
  const verifiedCount = participants.filter((p) => p.paymentStatus === 'verified').length;
  const checkedInCount = participants.filter((p) => p.isCheckedIn).length;
  const totalRevenue = participants
    .filter((p) => p.paymentStatus === 'verified')
    .reduce((sum, p) => sum + p.paymentAmount, 0);

  const stats: Stats = {
    totalRegistered: participants.length,
    pendingPayment: pendingCount,
    verifiedPayment: verifiedCount,
    ticketsSent: participants.filter((p) => p.ticketSentAt).length,
    checkedIn: checkedInCount,
    checkInPercentage: verifiedCount > 0 ? Math.round((checkedInCount / verifiedCount) * 100) : 0,
    totalRevenue,
  };

  // Google Forms API Live Sync
  const handleSyncForms = async () => {
    try {
      const authRes = await googleSignIn();
      if (authRes?.accessToken) {
        const liveParticipants = await fetchLiveFormResponses(authRes.accessToken);
        if (liveParticipants.length > 0) {
          setParticipants((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnly = liveParticipants.filter((p) => !existingIds.has(p.id));
            return [...newOnly, ...prev];
          });
        }
      }
    } catch (err) {
      console.warn('Opening sheet import:', err);
      setIsNewModalOpen(true);
    }
  };

  const handleVerifyPayment = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === participantId) {
          const updated: Participant = {
            ...p,
            paymentStatus: 'verified',
            verifiedAt: new Date().toLocaleString('es-ES'),
            verifiedBy: 'Comité Promoción 106',
            ticketSentAt: new Date().toLocaleString('es-ES'),
          };
          setSelectedParticipantForTicket(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const handleRejectPayment = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, paymentStatus: 'rejected' } : p))
    );
  };

  const handleSendEmailConfirmed = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId ? { ...p, ticketSentAt: new Date().toLocaleString('es-ES') } : p
      )
    );
  };

  const handleCheckInParticipant = (
    participantId: string
  ): {
    success: boolean;
    participant?: Participant;
    reason?: 'valid' | 'already_checked_in' | 'unpaid' | 'not_found';
  } => {
    const found = participants.find((p) => p.id === participantId);

    if (!found) {
      return { success: false, reason: 'not_found' };
    }

    if (found.paymentStatus !== 'verified') {
      return { success: false, participant: found, reason: 'unpaid' };
    }

    if (found.isCheckedIn) {
      return { success: false, participant: found, reason: 'already_checked_in' };
    }

    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    let updatedParticipant: Participant | undefined;

    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === participantId) {
          updatedParticipant = {
            ...p,
            isCheckedIn: true,
            checkedInAt: nowStr,
            checkedInBy: 'Lector Control de Acceso',
          };
          return updatedParticipant;
        }
        return p;
      })
    );

    return { success: true, participant: updatedParticipant || found, reason: 'valid' };
  };

  const handleUndoCheckIn = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isCheckedIn: false, checkedInAt: undefined } : p))
    );
  };

  const handleAddParticipant = (
    newP: Omit<Participant, 'id' | 'registeredAt' | 'paymentStatus' | 'isCheckedIn'>
  ) => {
    const randomId = `NEURO-${Math.floor(1000 + Math.random() * 9000)}`;
    const created: Participant = {
      ...newP,
      id: randomId,
      registeredAt: new Date().toLocaleString('es-ES'),
      paymentStatus: 'pending',
      isCheckedIn: false,
    };
    setParticipants((prev) => [created, ...prev]);
  };

  const handleImportBatch = (rawCsv: string) => {
    const lines = rawCsv.split('\n').filter((l) => l.trim().length > 0);
    const newItems: Participant[] = [];

    lines.forEach((line) => {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const fullName = parts[0];
        const email = parts[1];
        const phone = parts[2] || '';
        const tier = (parts[3] as any) || 'General';
        const amount = parseFloat(parts[4]) || 0;

        newItems.push({
          id: `NEURO-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName,
          email,
          phone,
          tier,
          registeredAt: new Date().toLocaleString('es-ES'),
          paymentStatus: 'pending',
          paymentAmount: amount,
          paymentReference: `FORM-${Math.floor(Math.random() * 89999 + 10000)}`,
          isCheckedIn: false,
        });
      }
    });

    if (newItems.length > 0) {
      setParticipants((prev) => [...newItems, ...prev]);
    }
  };

  const handleUpdateConfig = (updated: Partial<EventConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onSyncForms={handleSyncForms}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        {activeTab === 'dashboard' && (
          <DashboardStats
            participants={participants}
            stats={stats}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSyncForms={handleSyncForms}
          />
        )}

        {activeTab === 'verification' && (
          <PaymentVerificationList
            participants={participants}
            onVerifyPayment={handleVerifyPayment}
            onRejectPayment={handleRejectPayment}
            onSelectParticipantForTicket={(p) => setSelectedParticipantForTicket(p)}
          />
        )}

        {activeTab === 'template' && (
          <TicketTemplateDesigner
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {activeTab === 'scanner' && (
          <QRScannerView
            participants={participants}
            onCheckInParticipant={handleCheckInParticipant}
            onUndoCheckIn={handleUndoCheckIn}
          />
        )}

        {activeTab === 'guide' && <IntegrationGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Taller de Neuroimagen, el arte de diagnosticar a tiempo</strong> — Promoción 106 de Médicos Cirujanos
          </div>
          <div>
            Fecha: 5 de Diciembre, 2026
          </div>
        </div>
      </footer>

      {/* Ticket Preview Modal */}
      {selectedParticipantForTicket && (
        <TicketModal
          participant={selectedParticipantForTicket}
          config={config}
          onClose={() => setSelectedParticipantForTicket(null)}
          onSendEmailConfirmed={handleSendEmailConfirmed}
        />
      )}

      {/* New Participant / Import Modal */}
      {isNewModalOpen && (
        <NewParticipantModal
          onClose={() => setIsNewModalOpen(false)}
          onAddParticipant={handleAddParticipant}
          onImportBatch={handleImportBatch}
        />
      )}

    </div>
  );
}
