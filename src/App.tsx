/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { Participant, EventConfig, Stats } from './types';
import { INITIAL_EVENT_CONFIG } from './utils/sampleData';
import {
  db,
  initAuth,
  googleSignIn,
  googleLogout,
  ensureAccessToken,
  forceRefreshAccessToken,
  handleFirestoreError,
  OperationType,
} from './utils/googleAuth';
import { fetchLiveFormResponses, InsufficientScopesError } from './utils/googleFormsApi';
import {
  generateQRCodeDataUrl,
  buildParticipantQRPayload,
  getSequentialTicketId,
} from './utils/qr';
import {
  generateSlideTicketAndSendEmail,
  deleteParticipantSlideFromGoogleSlides,
} from './utils/emailService';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { PaymentVerificationList } from './components/PaymentVerificationList';
import { TicketTemplateDesigner } from './components/TicketTemplateDesigner';
import { TicketModal } from './components/TicketModal';
import { QRScannerView } from './components/QRScannerView';
import { IntegrationGuide } from './components/IntegrationGuide';
import { AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'verification' | 'template' | 'scanner' | 'guide'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [hasWorkspaceToken, setHasWorkspaceToken] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [config, setConfig] = useState<EventConfig>(INITIAL_EVENT_CONFIG);

  const [selectedParticipantForTicket, setSelectedParticipantForTicket] = useState<Participant | null>(null);
  const [latestGeneratedSlideImage, setLatestGeneratedSlideImage] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [processingParticipantId, setProcessingParticipantId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Initialize Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        setHasWorkspaceToken(Boolean(token));
        setAuthReady(true);
      },
      () => {
        setUser(null);
        setHasWorkspaceToken(false);
        setAuthReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Subscription for /participants
  useEffect(() => {
    if (!authReady || !user) {
      setParticipants([]);
      return;
    }

    const path = 'participants';
    const isSharedOrganizer =
      user.email === 'pedroacosta182002@gmail.com' ||
      user.email === 'promo106udoanz@gmail.com';
    const q = isSharedOrganizer
      ? query(collection(db, path))
      : query(collection(db, path), where('ownerEmail', '==', user.email || ''));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Participant[] = [];
        snapshot.forEach((docSnap) => {
          docs.push(docSnap.data() as Participant);
        });
        setParticipants(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Stats calculation
  const pendingCount = participants.filter((p) => p.paymentStatus === 'pending').length;
  const verifiedCount = participants.filter((p) => p.paymentStatus === 'verified').length;
  const checkedInCount = participants.filter((p) => p.isCheckedIn).length;

  const stats: Stats = {
    totalRegistered: participants.length,
    pendingPayment: pendingCount,
    verifiedPayment: verifiedCount,
    ticketsSent: participants.filter((p) => Boolean(p.ticketSentAt)).length,
    checkedIn: checkedInCount,
    checkInPercentage: verifiedCount > 0 ? Math.round((checkedInCount / verifiedCount) * 100) : 0,
  };

  // Sign In with Google (grants Forms, Slides, Drive, Gmail tokens + Firebase Auth)
  const handleLogin = async () => {
    setBannerNotice(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setHasWorkspaceToken(true);
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        text: err.message || 'No se pudo iniciar sesión con Google.',
      });
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    setUser(null);
    setHasWorkspaceToken(false);
  };

  // Live Google Forms Synchronization -> Persist to Firestore
  const handleSyncForms = async () => {
    setIsSyncing(true);
    setBannerNotice(null);
    try {
      let token = await ensureAccessToken();
      setHasWorkspaceToken(true);
      const ownerEmail = user?.email || 'pedroacosta182002@gmail.com';
      let liveParticipants: Participant[];
      try {
        liveParticipants = await fetchLiveFormResponses(token, ownerEmail);
      } catch (err) {
        if (err instanceof InsufficientScopesError) {
          token = await forceRefreshAccessToken();
          liveParticipants = await fetchLiveFormResponses(token, ownerEmail);
        } else {
          throw err;
        }
      }

      const existingMap = new Map<string, Participant>();
      participants.forEach((p) => existingMap.set(p.id, p));
      const liveIds = new Set<string>(liveParticipants.map((p) => p.id));

      let addedCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;

      for (const incoming of liveParticipants) {
        const existing = existingMap.get(incoming.id);
        const docRef = doc(db, 'participants', incoming.id);

        if (!existing) {
          try {
            await setDoc(docRef, {
              ...incoming,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            addedCount++;
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `participants/${incoming.id}`);
          }
        } else {
          // Update form fields if any answer or receipt changed while preserving verification & check-in status
          if (
            existing.fullName !== incoming.fullName ||
            existing.email !== incoming.email ||
            existing.phone !== incoming.phone ||
            existing.cedula !== incoming.cedula ||
            existing.paymentReference !== incoming.paymentReference ||
            existing.paymentProofFileId !== incoming.paymentProofFileId ||
            existing.paymentProofUrl !== incoming.paymentProofUrl ||
            existing.rawAnswersJson !== incoming.rawAnswersJson
          ) {
            try {
              await updateDoc(docRef, {
                fullName: incoming.fullName,
                email: incoming.email,
                phone: incoming.phone,
                cedula: incoming.cedula,
                paymentReference: incoming.paymentReference,
                paymentProofFileId: incoming.paymentProofFileId,
                paymentProofUrl: incoming.paymentProofUrl,
                rawAnswersJson: incoming.rawAnswersJson,
                ticketSentAt: existing.ticketSentAt,
                generatedSlideId: existing.generatedSlideId,
                updatedAt: serverTimestamp(),
              });
              updatedCount++;
            } catch (error) {
              handleFirestoreError(error, OperationType.UPDATE, `participants/${incoming.id}`);
            }
          }
        }
      }

      // Remove any participant from Firestore whose response was deleted in Google Forms
      for (const existing of participants) {
        if (!liveIds.has(existing.id)) {
          try {
            await deleteDoc(doc(db, 'participants', existing.id));
            if (existing.generatedSlideId) {
              await deleteParticipantSlideFromGoogleSlides(
                existing.generatedSlideId,
                config.googleSlidesUrl
              );
            }
            deletedCount++;
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `participants/${existing.id}`);
          }
        }
      }

      setBannerNotice({
        type: 'success',
        text: `Sincronización completada con Google Forms: ${liveParticipants.length} respuestas activas (${addedCount} nuevas, ${updatedCount} actualizadas, ${deletedCount} eliminadas).`,
      });
    } catch (err: any) {
      console.error('Error syncing Google Forms:', err);
      setBannerNotice({
        type: 'error',
        text: err.message || 'Error al sincronizar respuestas del Google Form.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic Flow on "Verify Payment":
  // 1. Copy Google Slides template & replace participant placeholders + QR code
  // 2. Send email immediately via Gmail API (or SMTP)
  // 3. Update Firestore paymentStatus = 'verified' and ticketSentAt
  // 4. Open modal showing the generated Google Slide ticket
  const handleVerifyAndSendAutomatic = async (participant: Participant) => {
    setProcessingParticipantId(participant.id);
    setBannerNotice(null);

    try {
      const sequentialId = getSequentialTicketId(participant, participants);
      const payload = buildParticipantQRPayload(sequentialId, participant.email);
      const qrDataUrl = await generateQRCodeDataUrl(payload);

      const savedSmtp = localStorage.getItem('neuroimagen_smtp');
      const smtpConfig = savedSmtp ? JSON.parse(savedSmtp) : null;
      const activeSmtp =
        smtpConfig && smtpConfig.user && smtpConfig.pass
          ? { ...smtpConfig, host: smtpConfig.host || 'smtp.gmail.com' }
          : null;

      const result = await generateSlideTicketAndSendEmail(
        participant,
        config,
        qrDataUrl,
        sequentialId,
        true,
        activeSmtp
      );

      const nowStr = new Date().toLocaleString('es-ES').substring(0, 80);
      const verifierEmail = (user?.email || 'pedroacosta182002@gmail.com').substring(0, 200);
      const slideId = (result.generatedSlideId || `pase_${sequentialId}`).substring(0, 150);

      const docRef = doc(db, 'participants', participant.id);
      try {
        await updateDoc(docRef, {
          paymentStatus: 'verified',
          verifiedAt: nowStr,
          verifiedBy: verifierEmail,
          ticketSentAt: result.emailSent ? nowStr : participant.ticketSentAt,
          generatedSlideId: slideId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `participants/${participant.id}`);
      }

      const updatedParticipant: Participant = {
        ...participant,
        paymentStatus: 'verified',
        verifiedAt: nowStr,
        verifiedBy: verifierEmail,
        ticketSentAt: result.emailSent ? nowStr : participant.ticketSentAt,
        generatedSlideId: slideId,
      };

      setLatestGeneratedSlideImage(result.slideImageBase64 || null);
      setSelectedParticipantForTicket(updatedParticipant);

      setBannerNotice({
        type: 'success',
        text: `Pago verificado (ID: ${sequentialId}), diapositiva creada en tu presentación de Google Slides y correo enviado automáticamente a ${participant.email}.`,
      });
    } catch (err: any) {
      console.error('Verify & Send error:', err);
      setBannerNotice({
        type: 'error',
        text: err.message || 'Ocurrió un error al generar la diapositiva o enviar el correo.',
      });
    } finally {
      setProcessingParticipantId(null);
    }
  };

  const handleRejectPayment = async (participantId: string) => {
    const target = participants.find((p) => p.id === participantId);
    if (!target) return;

    const docRef = doc(db, 'participants', participantId);
    try {
      await updateDoc(docRef, {
        paymentStatus: 'rejected',
        verifiedAt: new Date().toLocaleString('es-ES').substring(0, 80),
        verifiedBy: (user?.email || 'pedroacosta182002@gmail.com').substring(0, 200),
        ticketSentAt: target.ticketSentAt,
        generatedSlideId: target.generatedSlideId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${participantId}`);
    }
  };

  // Revert a verified payment back to pending & delete its slide from Google Slides
  const handleRevertVerifiedPayment = async (participant: Participant) => {
    const docRef = doc(db, 'participants', participant.id);
    try {
      await updateDoc(docRef, {
        paymentStatus: 'pending',
        verifiedAt: '',
        verifiedBy: '',
        ticketSentAt: '',
        generatedSlideId: '',
        updatedAt: serverTimestamp(),
      });
      if (participant.generatedSlideId) {
        await deleteParticipantSlideFromGoogleSlides(
          participant.generatedSlideId,
          config.googleSlidesUrl
        );
      }
      setBannerNotice({
        type: 'success',
        text: `Se anuló el pago verificado de ${participant.fullName} y volvió al estado Pendiente.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${participant.id}`);
    }
  };

  // Delete a participant record completely from Firestore & delete its slide from Google Slides
  const handleDeleteParticipant = async (participant: Participant) => {
    const docRef = doc(db, 'participants', participant.id);
    try {
      await deleteDoc(docRef);
      if (participant.generatedSlideId) {
        await deleteParticipantSlideFromGoogleSlides(
          participant.generatedSlideId,
          config.googleSlidesUrl
        );
      }
      setBannerNotice({
        type: 'success',
        text: `Se eliminó el registro de ${participant.fullName} de la base de datos.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `participants/${participant.id}`);
    }
  };

  const handleTicketGeneratedAndSent = async (
    participantId: string,
    generatedSlideId: string,
    emailSent: boolean
  ) => {
    const target = participants.find((p) => p.id === participantId);
    if (!target) return;

    const nowStr = new Date().toLocaleString('es-ES').substring(0, 80);
    const docRef = doc(db, 'participants', participantId);
    try {
      await updateDoc(docRef, {
        paymentStatus: target.paymentStatus,
        verifiedAt: target.verifiedAt,
        verifiedBy: target.verifiedBy,
        ticketSentAt: emailSent ? nowStr : target.ticketSentAt,
        generatedSlideId: (generatedSlideId || target.generatedSlideId).substring(0, 150),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${participantId}`);
    }
  };

  // Real-time QR Check-in persisted to Firestore
  const handleCheckInParticipant = async (
    participantId: string
  ): Promise<{
    success: boolean;
    participant?: Participant;
    reason?: 'valid' | 'already_checked_in' | 'unpaid' | 'not_found';
  }> => {
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

    const nowStr = new Date()
      .toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      .substring(0, 80);
    const scannerEmail = (user?.email || 'Control de Acceso').substring(0, 200);

    const docRef = doc(db, 'participants', participantId);
    try {
      await updateDoc(docRef, {
        isCheckedIn: true,
        checkedInAt: nowStr,
        checkedInBy: scannerEmail,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${participantId}`);
    }

    return {
      success: true,
      participant: {
        ...found,
        isCheckedIn: true,
        checkedInAt: nowStr,
        checkedInBy: scannerEmail,
      },
      reason: 'valid',
    };
  };

  const handleUndoCheckIn = async (participantId: string) => {
    const docRef = doc(db, 'participants', participantId);
    try {
      await updateDoc(docRef, {
        isCheckedIn: false,
        checkedInAt: '',
        checkedInBy: '',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `participants/${participantId}`);
    }
  };

  const handleUpdateConfig = (updated: Partial<EventConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const FLUID = [0.22, 1, 0.36, 1] as const;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col font-sans text-slate-900">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          onSyncForms={handleSyncForms}
          isSyncing={isSyncing}
          user={user}
          hasWorkspaceToken={hasWorkspaceToken}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 pb-32 pt-6 sm:px-6 md:pb-12 lg:px-8">
          {/* Aviso global */}
          <AnimatePresence>
            {bannerNotice && (
              <motion.div
                key="banner"
                role="status"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.3, ease: FLUID }}
                className={`glass flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${
                  bannerNotice.type === 'success' ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {bannerNotice.type === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  )}
                  <span className="leading-relaxed">{bannerNotice.text}</span>
                </div>
                <button
                  onClick={() => setBannerNotice(null)}
                  aria-label="Cerrar aviso"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full opacity-60 transition-opacity hover:bg-slate-900/5 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!authReady ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Cargando sesión…</span>
            </div>
          ) : !user ? (
            <LoginScreen onLogin={handleLogin} />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: FLUID }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardStats
                    participants={participants}
                    stats={stats}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                    onSyncForms={handleSyncForms}
                    isSyncing={isSyncing}
                  />
                )}

                {activeTab === 'verification' && (
                  <PaymentVerificationList
                    participants={participants}
                    processingParticipantId={processingParticipantId}
                    onRequestVerifyAndSend={handleVerifyAndSendAutomatic}
                    onRejectPayment={handleRejectPayment}
                    onRevertVerifiedPayment={handleRevertVerifiedPayment}
                    onDeleteParticipant={handleDeleteParticipant}
                    onSelectParticipantForTicket={(p) => {
                      setLatestGeneratedSlideImage(null);
                      setSelectedParticipantForTicket(p);
                    }}
                  />
                )}

                {activeTab === 'template' && (
                  <TicketTemplateDesigner
                    config={config}
                    participants={participants}
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
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="mx-auto hidden w-full max-w-7xl px-4 pb-8 text-xs text-slate-500 sm:px-6 md:block lg:px-8">
          <div className="flex items-center justify-between gap-2 border-t border-slate-900/5 pt-5">
            <p className="font-medium text-slate-600">Taller de Neuroimagen · Promoción 106 de Médicos Cirujanos</p>
            <p>5 de diciembre</p>
          </div>
        </footer>

        {selectedParticipantForTicket && (
          <TicketModal
            participant={selectedParticipantForTicket}
            allParticipants={participants}
            config={config}
            initialSlideImageBase64={latestGeneratedSlideImage}
            onClose={() => {
              setSelectedParticipantForTicket(null);
              setLatestGeneratedSlideImage(null);
            }}
            onTicketGeneratedAndSent={handleTicketGeneratedAndSent}
          />
        )}
      </div>
    </MotionConfig>
  );
}
