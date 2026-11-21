import { Participant, EventConfig } from '../types';
import { ensureAccessToken, getAccessToken } from './googleAuth';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  senderName: string;
}

export interface GenerateAndSendResponse {
  success: boolean;
  slideImageBase64?: string;
  generatedSlideId?: string;
  sequentialId?: string;
  createdOrUpdatedInSlides?: boolean;
  emailSent?: boolean;
  emailMethod?: string;
  error?: string;
}

/**
 * Fetches the customized SVG from Slide 1 of the user's live Google Slides template
 * (with <<Nombre>>, <<Correo>>, <<ID>>, and <<QR>> replaced in their exact designated coordinates)
 * and renders it to a high-resolution 1920x1080 PNG via HTML5 Canvas.
 */
export async function renderCustomizedSlideToPngBase64(
  participant: Pick<Participant, 'id' | 'fullName' | 'email'>,
  slidesUrl: string,
  qrDataUrl: string,
  sequentialId: string
): Promise<string> {
  const res = await fetch('/api/render-customized-slide-svg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant,
      slidesUrl,
      qrDataUrl,
      sequentialId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.svgDataUrl) {
    throw new Error(data.error || 'No se pudo adaptar la plantilla de Google Slides.');
  }

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(data.svgDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngDataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(pngDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error('Error al renderizar la diapositiva personalizada en PNG.'));
    };
    img.src = data.svgDataUrl;
  });
}

/**
 * Creates a slide for the verified participant inside the user's Google Slides presentation,
 * fills in <<Nombre>>, <<Correo>>, <<ID>> (001, 002, 003...), places the QR code inside the
 * designated #D9D9D9 rounded box, exports the slide PNG, and sends the email via Gmail API or SMTP.
 */
export async function generateSlideTicketAndSendEmail(
  participant: Participant,
  config: EventConfig,
  qrDataUrl: string,
  sequentialId: string,
  sendEmailNow: boolean,
  smtpConfig?: SmtpConfig | null
): Promise<GenerateAndSendResponse> {
  const formattedSeqId = String(sequentialId || '001').padStart(3, '0');

  let renderedSlidePngBase64 = '';
  try {
    renderedSlidePngBase64 = await renderCustomizedSlideToPngBase64(
      participant,
      config.googleSlidesUrl,
      qrDataUrl,
      formattedSeqId
    );
  } catch (err) {
    console.warn('SVG canvas pre-render warning:', err);
  }

  let accessToken = (await getAccessToken()) || '';
  if (sendEmailNow && (!smtpConfig || !smtpConfig.host)) {
    accessToken = await ensureAccessToken();
  }

  const response = await fetch('/api/generate-and-send-ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      participant,
      config,
      qrDataUrl,
      sequentialId: formattedSeqId,
      renderedSlidePngBase64,
      sendEmailNow,
      smtpConfig: smtpConfig || undefined,
      accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al crear la diapositiva en Google Slides o enviar el correo.');
  }

  return data;
}

/**
 * Deletes a participant's slide (e.g. "pase_001") from the Google Slides presentation
 * when their verified payment is reverted or their form response is deleted.
 */
export async function deleteParticipantSlideFromGoogleSlides(
  slideObjectId: string | undefined,
  slidesUrl: string
): Promise<void> {
  if (!slideObjectId || !slideObjectId.startsWith('pase_')) return;
  try {
    const accessToken = (await getAccessToken()) || '';
    if (!accessToken) return;
    await fetch('/api/delete-participant-slide', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        slideObjectId,
        slidesUrl,
        accessToken,
      }),
    });
  } catch (err) {
    console.warn('Could not remove slide from Google Slides:', err);
  }
}

