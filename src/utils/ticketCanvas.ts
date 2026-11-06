import { Participant, EventConfig } from '../types';

/**
 * Draws a clean, sober badge on a 100% white background with dark text.
 */
export async function renderTicketToCanvas(
  canvas: HTMLCanvasElement,
  participant: Participant,
  config: EventConfig,
  qrDataUrl: string
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1200;
  const height = 675;

  canvas.width = width;
  canvas.height = height;

  // Pure white canvas background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Card Container Box (Clean subtle border)
  const cardMargin = 40;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;

  const radius = 16;
  ctx.beginPath();
  ctx.roundRect(cardMargin, cardMargin, cardW, cardH, radius);
  ctx.fill();
  ctx.stroke();

  // Sky Blue Left Accent Bar
  ctx.fillStyle = '#0284c7'; // sky-600
  ctx.beginPath();
  ctx.roundRect(cardMargin, cardMargin, 10, cardH, [16, 0, 0, 16]);
  ctx.fill();

  // Header Subtitle / Organization
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PROMOCIÓN 106 DE MÉDICOS CIRUJANOS', cardMargin + 40, cardMargin + 55);

  // Main Event Title (Dark, crisp typography)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  
  const titleText = config.eventName;
  if (titleText.length > 55) {
    ctx.fillText('Taller de Neuroimagen, el arte de diagnosticar a tiempo', cardMargin + 40, cardMargin + 100);
    ctx.fillStyle = '#334155';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Promoción 106 de Médicos Cirujanos', cardMargin + 40, cardMargin + 135);
  } else {
    ctx.fillText(titleText, cardMargin + 40, cardMargin + 105);
  }

  // Event Date and Location
  ctx.fillStyle = '#475569';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Fecha: ${config.eventDate}   |   Lugar: ${config.eventLocation}`, cardMargin + 40, cardMargin + 175);

  // Separator Line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardMargin + 40, cardMargin + 205);
  ctx.lineTo(cardMargin + cardW - 40, cardMargin + 205);
  ctx.stroke();

  // Attendee Info Section
  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ASISTENTE ACREDITADO:', cardMargin + 40, cardMargin + 245);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(participant.fullName, cardMargin + 40, cardMargin + 290);

  ctx.fillStyle = '#475569';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(participant.email, cardMargin + 40, cardMargin + 325);

  // Ticket ID & Verification Box
  const metaBoxX = cardMargin + 40;
  const metaBoxY = cardMargin + 365;
  const metaBoxW = 480;
  const metaBoxH = 145;

  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(metaBoxX, metaBoxY, metaBoxW, metaBoxH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillText('CÓDIGO DE ENTRADA:', metaBoxX + 20, metaBoxY + 35);
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(participant.id, metaBoxX + 180, metaBoxY + 35);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillText('ESTADO PAGO:', metaBoxX + 20, metaBoxY + 75);
  ctx.fillStyle = '#16a34a';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('✓ VERIFICADO', metaBoxX + 180, metaBoxY + 75);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillText('FECHA EMISIÓN:', metaBoxX + 20, metaBoxY + 115);
  ctx.fillStyle = '#334155';
  ctx.fillText(participant.verifiedAt || new Date().toLocaleDateString('es-ES'), metaBoxX + 180, metaBoxY + 115);

  // Right Side: QR Code Frame (Pure White Box with Border)
  const qrContainerW = 320;
  const qrContainerH = 410;
  const qrContainerX = cardMargin + cardW - qrContainerW - 40;
  const qrContainerY = cardMargin + 100;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(qrContainerX, qrContainerY, qrContainerW, qrContainerH, 12);
  ctx.fill();
  ctx.stroke();

  // Load and draw QR Code
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  const qrSize = 240;
  const qrX = qrContainerX + (qrContainerW - qrSize) / 2;
  const qrY = qrContainerY + 25;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRESENTAR EN ENTRADA', qrContainerX + qrContainerW / 2, qrContainerY + 300);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText(`ID: ${participant.id}`, qrContainerX + qrContainerW / 2, qrContainerY + 330);
  ctx.fillText('Acreditación personal', qrContainerX + qrContainerW / 2, qrContainerY + 355);

  ctx.textAlign = 'left';
  ctx.restore();
}

export function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
