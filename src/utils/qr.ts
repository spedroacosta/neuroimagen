import QRCode from 'qrcode';

/**
 * Generates a Data URL image string for a given QR string payload
 */
export async function generateQRCodeDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

/**
 * Creates a unique verification payload string for a participant
 */
export function buildParticipantQRPayload(participantId: string, email: string): string {
  // Format: PASSFLOW:<ID>:<HASH_SHORT>
  const signature = window.btoa(`${participantId}:${email}`).substring(0, 10);
  return `PASSFLOW:${participantId}:${signature}`;
}

/**
 * Parses and validates a QR payload payload
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

  // Fallback: check if raw payload is just the participant ID or ticket ID directly
  return { isValid: true, participantId: trimmed };
}
