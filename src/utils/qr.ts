import QRCode from 'qrcode';
import { Participant } from '../types';

/**
 * Generates a Data URL image string for a given QR string payload
 */
export async function generateQRCodeDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 500,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Extracts the 3-digit sequential verification ID (e.g., "001", "002") from generatedSlideId ("pase_001")
 */
export function extractSequentialId(participant?: Pick<Participant, 'generatedSlideId'> | null): string | null {
  if (!participant?.generatedSlideId) return null;
  const match = participant.generatedSlideId.match(/pase_(\d{3,})/i);
  if (match) return match[1];
  if (/^\d{3,}$/.test(participant.generatedSlideId.trim())) {
    return participant.generatedSlideId.trim();
  }
  return null;
}

/**
 * Computes or returns the sequential 3-digit verification ID ("001", "002", "003", ...)
 * based on the order in which the participant's payment was verified.
 */
export function getSequentialTicketId(
  targetParticipant: Participant,
  allParticipants: Participant[]
): string {
  const existingSeq = extractSequentialId(targetParticipant);
  if (existingSeq) return existingSeq;

  // Find all already-verified participants
  const verifiedList = allParticipants.filter((p) => p.paymentStatus === 'verified');

  // If targetParticipant is already verified, find its position among verified participants
  if (targetParticipant.paymentStatus === 'verified') {
    const idx = verifiedList.findIndex((p) => p.id === targetParticipant.id);
    if (idx !== -1) {
      return String(idx + 1).padStart(3, '0');
    }
  }

  // Otherwise, compute the next sequential number to assign when verifying this participant
  let maxAssigned = 0;
  allParticipants.forEach((p) => {
    if (p.id === targetParticipant.id) return;
    const seq = extractSequentialId(p);
    if (seq) {
      const n = parseInt(seq, 10);
      if (!isNaN(n) && n > maxAssigned) maxAssigned = n;
    }
  });

  const otherVerifiedCount = verifiedList.filter((p) => p.id !== targetParticipant.id).length;
  const nextNumber = Math.max(maxAssigned, otherVerifiedCount) + 1;
  return String(nextNumber).padStart(3, '0');
}

/**
 * Creates a unique verification payload string for a participant
 */
export function buildParticipantQRPayload(ticketOrParticipantId: string, email: string): string {
  // Format: PASSFLOW:<ID>:<HASH_SHORT>
  const signature = window.btoa(`${ticketOrParticipantId}:${email}`).substring(0, 10);
  return `PASSFLOW:${ticketOrParticipantId}:${signature}`;
}

/**
 * Parses and validates a QR payload
 */
export function parseQRPayload(rawPayload: string): { isValid: boolean; participantId?: string } {
  if (!rawPayload) return { isValid: false };
  const trimmed = rawPayload.trim();

  // If payload matches PASSFLOW:<ID>:<HASH>
  if (trimmed.startsWith('PASSFLOW:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      return { isValid: true, participantId: parts[1] };
    }
  }

  // Fallback: check if raw payload is just the sequential ID (e.g., "001") or participant ID directly
  return { isValid: true, participantId: trimmed };
}
