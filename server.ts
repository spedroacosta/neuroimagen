import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import path from 'path';

const DEFAULT_SLIDES_TEMPLATE_ID = '1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY';

function extractSlideIdFromUrl(urlOrId?: string): string {
  if (!urlOrId) return DEFAULT_SLIDES_TEMPLATE_ID;
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  return match ? match[1] : urlOrId;
}

function toBase64Url(strOrBuffer: string | Buffer): string {
  const buf = typeof strOrBuffer === 'string' ? Buffer.from(strOrBuffer, 'utf-8') : strOrBuffer;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildQrPayloadServer(ticketId: string, email: string): string {
  const cleanEmail = (email || '').trim();
  const raw = `${ticketId}:${cleanEmail}`;
  const encoded = Buffer.from(raw, 'utf-8').toString('base64').substring(0, 10);
  return `PASSFLOW:${ticketId}:${encoded}`;
}

/**
 * Customizes the live SVG exported from Slide 1 of Google Slides by replacing the
 * <<Nombre>>, <<Correo>>, <<ID>>, and <<QR>> glyph paths in their exact designated coordinates,
 * keeping the #d9d9d9 gray rounded rectangle intact and placing the QR code centered inside it.
 */
async function buildCustomizedSlideSvg(
  templateId: string,
  participant: { id: string; fullName: string; email: string; sequentialId: string },
  qrDataUrl?: string
): Promise<string> {
  const svgRes = await fetch(
    `https://docs.google.com/presentation/d/${encodeURIComponent(templateId)}/export/svg`
  );
  if (!svgRes.ok) {
    throw new Error(`No se pudo exportar el SVG de la plantilla (${svgRes.status}).`);
  }
  const rawSvg = await svgRes.text();

  const finalQrDataUrl =
    qrDataUrl ||
    (await QRCode.toDataURL(buildQrPayloadServer(participant.sequentialId, participant.email), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 500,
      color: { dark: '#000000', light: '#ffffff' },
    }));

  // Find all <<...>> placeholder paths in the Google Slides SVG export
  const placeholderRegex =
    /<path\s+fill="([^"]+)"\s+d="m([0-9.]+)\s+([0-9.]+)l-([0-9.]+)\s+-([0-9.]+)l\4\s+-[0-9.]+[^"]*"\s+fill-rule="nonzero"\/>/g;

  let textFieldIdx = 0;
  const customizedSvg = rawSvg.replace(placeholderRegex, (fullMatch, fill, xStr, yStr, dxStr) => {
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const dx = parseFloat(dxStr);
    const leftX = Math.max(0, x - dx);

    // If this placeholder is <<QR>> inside the #d9d9d9 rounded box (x > 700 or fill=#475569)
    if (x > 680 || fill.toLowerCase() === '#475569') {
      // Exact conversion of user's slide2.xml EMU coordinates (x=7180275, y=3287911, cx=1246100, cy=1246075)
      return `<image x="753.83" y="345.19" width="130.82" height="130.82" preserveAspectRatio="xMidYMid meet" href="${finalQrDataUrl}" xlink:href="${finalQrDataUrl}" />`;
    }

    const currentTextIdx = textFieldIdx++;

    // 1st text placeholder: <<Nombre>> (under "Participante")
    if (currentTextIdx === 0) {
      return `<text x="${leftX.toFixed(1)}" y="${(y + 1.2).toFixed(
        1
      )}" fill="${fill}" font-family="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="400" font-size="16">${escapeXml(
        participant.fullName
      )}</text>`;
    }

    // 2nd text placeholder: <<Correo>> (under "Correo")
    if (currentTextIdx === 1) {
      return `<text x="${leftX.toFixed(1)}" y="${(y + 1.2).toFixed(
        1
      )}" fill="${fill}" font-family="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="400" font-size="16">${escapeXml(
        participant.email
      )}</text>`;
    }

    // 3rd text placeholder: <<ID>> (under "ID") -> Sequential 001, 002, 003...
    if (currentTextIdx === 2) {
      return `<text x="${leftX.toFixed(1)}" y="${(y + 1.2).toFixed(
        1
      )}" fill="${fill}" font-family="'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="400" font-size="16">${escapeXml(
        participant.sequentialId
      )}</text>`;
    }

    return fullMatch;
  });

  return customizedSvg;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // 1. Authenticated Google Drive File Proxy (for viewing Payment Proof images/PDFs uploaded in Google Forms)
  app.get('/api/drive-file/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      const authHeader = req.headers.authorization;
      const queryToken = req.query.token as string | undefined;
      const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

      if (!token) {
        return res
          .status(401)
          .json({ error: 'Token de Google requerido para ver el comprobante de Drive.' });
      }

      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}?fields=name,mimeType,thumbnailLink,webViewLink`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let mimeType = 'image/jpeg';
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta.mimeType) mimeType = meta.mimeType;
      }

      const mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!mediaRes.ok) {
        const errText = await mediaRes.text();
        return res
          .status(mediaRes.status)
          .json({ error: `No se pudo descargar el comprobante de Drive: ${errText}` });
      }

      const arrayBuffer = await mediaRes.arrayBuffer();
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error('Error fetching Drive file:', err);
      return res
        .status(500)
        .json({ error: err.message || 'Error al obtener el archivo de Google Drive.' });
    }
  });

  // 2. Real Google Slides Editable Template Inspection & Live Thumbnail Preview
  app.get('/api/inspect-slides-template', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader ? authHeader.replace('Bearer ', '') : (req.query.token as string);
      const templateId = extractSlideIdFromUrl(req.query.slidesUrl as string);

      if (token && token !== 'null' && token !== 'undefined') {
        const presRes = await fetch(
          `https://slides.googleapis.com/v1/presentations/${templateId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (presRes.ok) {
          const presData = await presRes.json();
          const firstSlide = presData.slides?.[0];
          const pageObjectId = firstSlide?.objectId || 'p';

          const detectedTexts: string[] = [];
          const detectedShapes: { objectId: string; type: string; text: string }[] = [];

          const inspectElements = (elements: any[]) => {
            (elements || []).forEach((el: any) => {
              if (el.elementGroup?.children) {
                inspectElements(el.elementGroup.children);
              }
              let textContent = '';
              if (el.shape?.text?.textElements) {
                textContent = el.shape.text.textElements
                  .map((te: any) => te.textRun?.content || '')
                  .join('')
                  .trim();
              }
              if (textContent) {
                detectedTexts.push(textContent);
              }
              detectedShapes.push({
                objectId: el.objectId,
                type: el.shape?.shapeType || (el.image ? 'IMAGE' : 'ELEMENT'),
                text: textContent,
              });
            });
          };

          inspectElements(firstSlide?.pageElements || []);

          let thumbnailBase64 = '';
          const thumbRes = await fetch(
            `https://slides.googleapis.com/v1/presentations/${templateId}/pages/${pageObjectId}/thumbnail?thumbnailProperties.thumbnailSize=LARGE&thumbnailProperties.mimeType=PNG`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (thumbRes.ok) {
            const thumbJson = await thumbRes.json();
            if (thumbJson.contentUrl) {
              const imgFetch = await fetch(thumbJson.contentUrl);
              if (imgFetch.ok) {
                const buf = Buffer.from(await imgFetch.arrayBuffer());
                thumbnailBase64 = `data:image/png;base64,${buf.toString('base64')}`;
              }
            }
          }

          if (!thumbnailBase64) {
            const directPng = await fetch(
              `https://docs.google.com/presentation/d/${templateId}/export/png`
            );
            if (directPng.ok) {
              const buf = Buffer.from(await directPng.arrayBuffer());
              thumbnailBase64 = `data:image/png;base64,${buf.toString('base64')}`;
            }
          }

          return res.json({
            title:
              presData.title ||
              'Plantilla Editable - Taller de Neuroimagen (Promoción 106 de Médicos Cirujanos)',
            templateId,
            pageObjectId,
            totalSlidesCount: presData.slides?.length || 1,
            detectedTexts,
            detectedShapes,
            thumbnailBase64,
          });
        }
      }

      const [txtRes, pngRes] = await Promise.all([
        fetch(`https://docs.google.com/presentation/d/${templateId}/export/txt`),
        fetch(`https://docs.google.com/presentation/d/${templateId}/export/png`),
      ]);

      if (!txtRes.ok && !pngRes.ok) {
        return res.status(400).json({
          error:
            'No se pudo leer la presentación de Google Slides. Verifica el enlace o inicia sesión con Google.',
        });
      }

      const rawTxt = txtRes.ok ? await txtRes.text() : '';
      const detectedTexts = rawTxt
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      let thumbnailBase64 = '';
      if (pngRes.ok) {
        const buf = Buffer.from(await pngRes.arrayBuffer());
        thumbnailBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      }

      return res.json({
        title: 'Plantilla Editable - Taller de Neuroimagen (Google Slides)',
        templateId,
        pageObjectId: 'p',
        totalSlidesCount: 1,
        detectedTexts,
        detectedShapes: [],
        thumbnailBase64,
      });
    } catch (err: any) {
      console.error('Error inspecting Slides template:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2B. Live Customized Google Slides SVG Renderer (replaces <<Nombre>>, <<Correo>>, <<ID>>, and <<QR>> in exact slide coordinates)
  app.post('/api/render-customized-slide-svg', async (req, res) => {
    try {
      const { participant, slidesUrl, qrDataUrl, sequentialId } = req.body;
      const templateId = extractSlideIdFromUrl(slidesUrl);
      const formattedSeqId = sequentialId || '001';
      const safeParticipant = {
        id: participant?.id || formattedSeqId,
        fullName: participant?.fullName || 'Pedro Acosta',
        email: participant?.email || 'pedroacosta182002@gmail.com',
        sequentialId: formattedSeqId,
      };

      const customizedSvg = await buildCustomizedSlideSvg(
        templateId,
        safeParticipant,
        qrDataUrl
      );

      return res.json({
        svg: customizedSvg,
        svgDataUrl: `data:image/svg+xml;base64,${Buffer.from(customizedSvg, 'utf-8').toString(
          'base64'
        )}`,
      });
    } catch (err: any) {
      console.error('Error rendering customized slide SVG:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Create Participant Slide inside the Google Slides Document + Automatic Email Delivery
  app.post('/api/generate-and-send-ticket', async (req, res) => {
    try {
      const {
        participant,
        config,
        sequentialId,
        sendEmailNow,
        smtpConfig,
        renderedSlidePngBase64,
      } = req.body;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader ? authHeader.replace('Bearer ', '') : req.body.accessToken;

      if (!participant || !participant.email) {
        return res.status(400).json({ error: 'Datos del participante incompletos.' });
      }

      const formattedSequentialId = String(sequentialId || '001').padStart(3, '0');
      const targetSlideObjectId = `pase_${formattedSequentialId}`;
      const templateId = extractSlideIdFromUrl(config?.googleSlidesUrl);

      const qrPayload = buildQrPayloadServer(formattedSequentialId, participant.email);
      const qrPublicUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
        qrPayload
      )}&size=500&margin=1&ecLevel=H`;

      const textReplacements: Record<string, string> = {
        '<<Nombre>>': participant.fullName,
        '<<NOMBRE>>': participant.fullName,
        '<<nombre>>': participant.fullName,
        '«Nombre»': participant.fullName,

        '<<Correo>>': participant.email,
        '<<CORREO>>': participant.email,
        '<<correo>>': participant.email,
        '«Correo»': participant.email,

        '<<ID>>': formattedSequentialId,
        '<<id>>': formattedSequentialId,
        '«ID»': formattedSequentialId,

        // Clear <<QR>> inside the #D9D9D9 rounded rectangle so the gray rounded rectangle stays intact
        '<<QR>>': '',
        '<<qr>>': '',
        '«QR»': '',
      };

      let pngBuffer: Buffer | null = null;
      let createdOrUpdatedInSlides = false;

      // STEP 1: Create (and KEEP) a new slide for this participant inside the user's Google Slides presentation
      if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') {
        try {
          const presRes = await fetch(
            `https://slides.googleapis.com/v1/presentations/${templateId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (presRes.ok) {
            const presData = await presRes.json();
            const slidesList: any[] = presData.slides || [];
            const masterPageId = slidesList[0]?.objectId || 'p';
            const slideAlreadyExists = slidesList.some(
              (s: any) => s.objectId === targetSlideObjectId
            );

            const batchRequests: any[] = [];

            // If re-generating for an already verified participant (e.g. pase_001), remove the old slide first so we recreate it cleanly from Slide 1
            if (slideAlreadyExists && targetSlideObjectId !== masterPageId) {
              batchRequests.push({
                deleteObject: {
                  objectId: targetSlideObjectId,
                },
              });
            }

            // Duplicate Slide 1 (the template slide) into targetSlideObjectId (e.g. "pase_001", "pase_002") and KEEP IT in the presentation
            batchRequests.push({
              duplicateObject: {
                objectId: masterPageId,
                objectIds: {
                  [masterPageId]: targetSlideObjectId,
                },
              },
            });

            // Move the newly created slide to the end of the presentation so slides stay in order: Template, 001, 002, 003...
            const targetInsertionIndex = slideAlreadyExists
              ? slidesList.length - 1
              : slidesList.length;
            batchRequests.push({
              updateSlidesPosition: {
                slideObjectIds: [targetSlideObjectId],
                insertionIndex: Math.max(1, targetInsertionIndex),
              },
            });

            // Replace <<Nombre>>, <<Correo>>, <<ID>>, and clear <<QR>> on the participant's slide
            Object.entries(textReplacements).forEach(([tag, value]) => {
              batchRequests.push({
                replaceAllText: {
                  pageObjectIds: [targetSlideObjectId],
                  containsText: {
                    text: tag,
                    matchCase: false,
                  },
                  replaceText: value,
                },
              });
            });

            // Place the QR code image centered inside the #D9D9D9 gray rounded rectangle (matching slide2.xml EMU coordinates)
            batchRequests.push({
              createImage: {
                url: qrPublicUrl,
                elementProperties: {
                  pageObjectId: targetSlideObjectId,
                  size: {
                    width: { magnitude: 1246100, unit: 'EMU' },
                    height: { magnitude: 1246075, unit: 'EMU' },
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 7180275,
                    translateY: 3287911,
                    unit: 'EMU',
                  },
                },
              },
            });

            const batchRes = await fetch(
              `https://slides.googleapis.com/v1/presentations/${templateId}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requests: batchRequests }),
              }
            );

            if (batchRes.ok) {
              createdOrUpdatedInSlides = true;
              const thumbRes = await fetch(
                `https://slides.googleapis.com/v1/presentations/${templateId}/pages/${targetSlideObjectId}/thumbnail?thumbnailProperties.thumbnailSize=LARGE&thumbnailProperties.mimeType=PNG`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              if (thumbRes.ok) {
                const thumbData = await thumbRes.json();
                const imgRes = await fetch(thumbData.contentUrl);
                if (imgRes.ok) {
                  pngBuffer = Buffer.from(await imgRes.arrayBuffer());
                }
              }
            } else {
              const batchErr = await batchRes.text();
              console.warn('Google Slides batchUpdate warning:', batchErr);
            }
          }
        } catch (slidesApiErr) {
          console.warn('Google Slides API call warning, using SVG render fallback:', slidesApiErr);
        }
      }

      // STEP 2: Fallback to the high-resolution PNG rendered directly from the live Google Slides SVG export
      if (!pngBuffer && renderedSlidePngBase64) {
        const base64Clean = renderedSlidePngBase64.replace(/^data:image\/\w+;base64,/, '');
        pngBuffer = Buffer.from(base64Clean, 'base64');
      }

      if (!pngBuffer) {
        return res.status(500).json({
          error:
            'No se pudo generar la imagen personalizada desde la plantilla de Google Slides.',
        });
      }

      const slideImageBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

      // STEP 3: Send confirmation email with the participant's slide PNG via Gmail API or SMTP
      let emailSent = false;
      let emailMethod = '';

      if (sendEmailNow) {
        const subject = `Confirmación de Entrada (ID: ${formattedSequentialId}) - Taller de Neuroimagen, el arte de diagnosticar a tiempo`;
        const htmlBody = buildConfirmationEmailHtml(
          participant,
          config,
          formattedSequentialId
        );

        if (smtpConfig && smtpConfig.user && smtpConfig.pass) {
          const transporter = nodemailer.createTransport({
            host: (smtpConfig.host || 'smtp.gmail.com').trim(),
            port: Number(smtpConfig.port) || 587,
            secure: Number(smtpConfig.port) === 465,
            auth: {
              user: smtpConfig.user.trim(),
              pass: smtpConfig.pass.trim(),
            },
          });

          const attachments: any[] = [
            {
              filename: `Entrada_${formattedSequentialId}_${participant.fullName.replace(
                /\s+/g,
                '_'
              )}.png`,
              content: pngBuffer,
              contentType: 'image/png',
              cid: 'ticket_slide_image',
            },
          ];

          await transporter.sendMail({
            from: `"${smtpConfig.senderName || 'Promoción 106 de Médicos Cirujanos'}" <${
              smtpConfig.user
            }>`,
            to: participant.email,
            subject,
            html: htmlBody,
            attachments,
          });

          emailSent = true;
          emailMethod = 'SMTP';
        } else {
          if (!accessToken) {
            return res.status(401).json({
              error: 'Inicia sesión con Google para enviar el correo por Gmail.',
              slideImageBase64,
              generatedSlideId: targetSlideObjectId,
              sequentialId: formattedSequentialId,
              emailSent: false,
            });
          }

          const rawMime = createMimeMessageWithAttachments({
            to: participant.email,
            subject,
            html: htmlBody,
            pngBuffer,
            pdfBuffer: null,
            ticketId: formattedSequentialId,
          });

          const encodedRaw = toBase64Url(rawMime);

          const gmailRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ raw: encodedRaw }),
            }
          );

          if (!gmailRes.ok) {
            const gmailErr = await gmailRes.text();
            return res.status(gmailRes.status).json({
              error: `La diapositiva se creó en Google Slides (ID: ${formattedSequentialId}), pero Gmail rechazó el envío (${gmailRes.status}): ${gmailErr}`,
              slideImageBase64,
              generatedSlideId: targetSlideObjectId,
              sequentialId: formattedSequentialId,
              emailSent: false,
            });
          }

          emailSent = true;
          emailMethod = 'Gmail API';
        }
      }

      return res.json({
        success: true,
        slideImageBase64,
        generatedSlideId: targetSlideObjectId,
        sequentialId: formattedSequentialId,
        createdOrUpdatedInSlides,
        emailSent,
        emailMethod,
      });
    } catch (err: any) {
      console.error('Error in /api/generate-and-send-ticket:', err);
      return res.status(500).json({
        error:
          err.message ||
          'Error interno al crear la diapositiva en Google Slides y enviar el correo.',
      });
    }
  });

  // 4. Delete a participant's slide from Google Slides when their verified payment or form response is deleted
  app.post('/api/delete-participant-slide', async (req, res) => {
    try {
      const { slideObjectId, slidesUrl } = req.body;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader ? authHeader.replace('Bearer ', '') : req.body.accessToken;

      if (!slideObjectId || !accessToken || accessToken === 'null') {
        return res.json({ success: true, skipped: true });
      }

      const templateId = extractSlideIdFromUrl(slidesUrl);
      const presRes = await fetch(
        `https://slides.googleapis.com/v1/presentations/${templateId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (presRes.ok) {
        const presData = await presRes.json();
        const slidesList: any[] = presData.slides || [];
        const masterPageId = slidesList[0]?.objectId || 'p';

        // Never delete Slide 1 (the template slide)
        if (
          slideObjectId !== masterPageId &&
          slidesList.some((s: any) => s.objectId === slideObjectId)
        ) {
          await fetch(
            `https://slides.googleapis.com/v1/presentations/${templateId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                requests: [{ deleteObject: { objectId: slideObjectId } }],
              }),
            }
          );
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.warn('Warning deleting slide from Google Slides:', err);
      return res.json({ success: false, error: err.message });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

function buildConfirmationEmailHtml(
  participant: any,
  config: any,
  sequentialId: string
): string {
  const eventTitle =
    config?.eventName ||
    'Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos';
  const eventDate = config?.eventDate || '5 de diciembre';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #0f172a;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;">
          ${eventTitle}
        </h2>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">
          Fecha del taller: <strong>${eventDate}</strong>
        </p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #1e293b;">
        Hola <strong>${participant.fullName}</strong>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #1e293b;">
        Hemos verificado tu pago (Comprobante Nº: <strong>${
          participant.paymentReference || 'Verificado'
        }</strong>) y tu inscripción al taller ha quedado confirmada con el <strong>ID: ${sequentialId}</strong>.
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #1e293b;">
        A continuación y adjunto a este correo encontrarás tu <strong>pase personalizado con tu código QR único</strong>. Por favor preséntalo el día del evento (${eventDate}) en la puerta de ingreso para escanear tu código QR.
      </p>

      <div style="margin: 24px 0; text-align: center;">
        <img src="cid:ticket_slide_image" alt="Entrada Taller de Neuroimagen" style="max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 8px;" />
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 12px; color: #475569;">
        <div><strong>Participante:</strong> ${participant.fullName}</div>
        <div><strong>Correo:</strong> ${participant.email}</div>
        <div><strong>ID:</strong> ${sequentialId}</div>
        <div><strong>Fecha:</strong> ${eventDate}</div>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center;">
        Promoción 106 de Médicos Cirujanos
      </p>
    </div>
  `;
}

function createMimeMessageWithAttachments(params: {
  to: string;
  subject: string;
  html: string;
  pngBuffer: Buffer;
  pdfBuffer: Buffer | null;
  ticketId: string;
}): string {
  const mixedBoundary = `----=_NextPart_Mixed_${Date.now()}`;
  const relatedBoundary = `----=_NextPart_Related_${Date.now()}`;

  const lines: string[] = [
    `To: ${params.to}`,
    `Subject: =?utf-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    '',
    `--${relatedBoundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.html, 'utf-8').toString('base64'),
    '',
    `--${relatedBoundary}`,
    `Content-Type: image/png; name="Entrada_${params.ticketId}.png"`,
    'Content-Transfer-Encoding: base64',
    'Content-ID: <ticket_slide_image>',
    `Content-Disposition: inline; filename="Entrada_${params.ticketId}.png"`,
    '',
    params.pngBuffer.toString('base64'),
    `--${relatedBoundary}--`,
  ];

  lines.push(
    '',
    `--${mixedBoundary}`,
    `Content-Type: image/png; name="Entrada_${params.ticketId}.png"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="Entrada_${params.ticketId}.png"`,
    '',
    params.pngBuffer.toString('base64')
  );

  lines.push('', `--${mixedBoundary}--`);
  return lines.join('\r\n');
}

startServer();
