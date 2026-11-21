import { Participant } from '../types';

export const FORM_ID = '1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
  return cleaned || `RESP-${Date.now()}`;
}

function truncate(str: string, max: number): string {
  return (str || '').trim().substring(0, max);
}

export class InsufficientScopesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientScopesError';
  }
}

/**
 * Fetches form responses (`forms.responses.readonly`) and attempts to fetch form structure (`forms.body.readonly`)
 * with graceful fallback if the token needs re-consent or if schema access fails.
 */
export async function fetchLiveFormResponses(
  accessToken: string,
  ownerEmail: string
): Promise<Participant[]> {
  // 1. Try to fetch Form Schema to map questionId -> exact question title (non-blocking if it fails)
  const questionTitleMap = new Map<string, string>();

  try {
    const formSchemaRes = await fetch(`https://forms.googleapis.com/v1/forms/${FORM_ID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (formSchemaRes.ok) {
      const formSchema = await formSchemaRes.json();
      const items = formSchema.items || [];
      items.forEach((item: any) => {
        const itemTitle = item.title || '';
        if (item.questionItem?.question?.questionId) {
          questionTitleMap.set(item.questionItem.question.questionId, itemTitle);
        }
        if (item.questionGroupItem?.questions) {
          item.questionGroupItem.questions.forEach((q: any) => {
            if (q.questionId) {
              questionTitleMap.set(q.questionId, itemTitle);
            }
          });
        }
      });
    } else {
      console.warn('Form schema returned non-OK status, continuing with responses endpoint:', formSchemaRes.status);
    }
  } catch (schemaErr) {
    console.warn('Form schema fetch error, continuing with responses endpoint:', schemaErr);
  }

  // 2. Fetch Form Responses
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${FORM_ID}/responses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || (res.status === 403 && errText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))) {
      throw new InsufficientScopesError('El token actual necesita actualizar sus permisos de Google.');
    }
    throw new Error(`Error al leer respuestas de Google Forms (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const responses = data.responses || [];

  const participants: Participant[] = responses.map((r: any, index: number) => {
    const rawResponseId = r.responseId || `idx-${index + 1}`;
    const deterministicId = `NEURO-${sanitizeId(rawResponseId).substring(0, 20)}`;

    let fullName = '';
    let email = r.respondentEmail || '';
    let phone = '';
    let cedula = '';
    let paymentReference = '';
    let paymentProofFileId = '';
    let paymentProofUrl = '';
    const allFieldsSummary: Record<string, string> = {};

    if (r.answers) {
      // Sort answers or iterate through all answers in the response
      const answerEntries = Object.entries(r.answers);

      answerEntries.forEach(([questionId, ans]: [string, any], ansIdx: number) => {
        const mappedTitle = questionTitleMap.get(questionId);
        const questionTitle = mappedTitle || `Campo ${ansIdx + 1} (${questionId})`;
        const qLower = (mappedTitle || '').toLowerCase();

        // A. Handle File Upload Answers (Google Drive uploaded payment receipts)
        if (ans.fileUploadAnswers?.answers?.length > 0) {
          const firstFile = ans.fileUploadAnswers.answers[0];
          if (firstFile.fileId) {
            paymentProofFileId = firstFile.fileId;
            allFieldsSummary[mappedTitle || 'Comprobante de pago (Archivo)'] =
              firstFile.fileName || firstFile.fileId;
          }
          return;
        }

        // B. Handle Text Answers
        const textValues = ans.textAnswers?.answers?.map((a: any) => a.value) || [];
        const text = textValues.join(' ').trim();
        if (!text) return;

        allFieldsSummary[questionTitle] = text;

        // 1. Check if we have the exact question title from the schema
        if (mappedTitle) {
          if (
            qLower.includes('comprobante') ||
            qLower.includes('referencia') ||
            qLower.includes('transacción') ||
            qLower.includes('transaccion') ||
            qLower.includes('operación') ||
            qLower.includes('operacion') ||
            qLower.includes('recibo') ||
            qLower.includes('voucher') ||
            (qLower.includes('número') && qLower.includes('pago')) ||
            (qLower.includes('numero') && qLower.includes('pago'))
          ) {
            const driveMatch = text.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || text.match(/id=([a-zA-Z0-9_-]{15,})/);
            if (driveMatch && driveMatch[1]) {
              paymentProofFileId = driveMatch[1];
            } else if (text.startsWith('http')) {
              paymentProofUrl = text;
            } else {
              paymentReference = text;
            }
            return;
          }

          if (
            qLower.includes('correo') ||
            qLower.includes('email') ||
            qLower.includes('e-mail') ||
            qLower.includes('mail')
          ) {
            email = text;
            return;
          }

          if (
            qLower.includes('nombre') ||
            qLower.includes('apellido') ||
            qLower.includes('participante') ||
            qLower.includes('estudiante') ||
            qLower.includes('médico') ||
            qLower.includes('medico') ||
            qLower.includes('completo')
          ) {
            fullName = fullName ? `${fullName} ${text}` : text;
            return;
          }

          if (
            qLower.includes('teléfono') ||
            qLower.includes('telefono') ||
            qLower.includes('celular') ||
            qLower.includes('whatsapp') ||
            qLower.includes('móvil') ||
            qLower.includes('movil') ||
            qLower.includes('contacto')
          ) {
            phone = text;
            return;
          }

          if (
            qLower.includes('cédula') ||
            qLower.includes('cedula') ||
            qLower.includes('documento') ||
            qLower.includes('dni') ||
            qLower.includes('identificación') ||
            qLower.includes('identificacion') ||
            qLower.includes('ci')
          ) {
            cedula = text;
            return;
          }
        }

        // 2. Smart heuristic fallback if schema wasn't loaded or question title didn't match keywords
        const driveMatch = text.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || text.match(/id=([a-zA-Z0-9_-]{15,})/);
        if (driveMatch && driveMatch[1]) {
          paymentProofFileId = driveMatch[1];
        } else if (text.startsWith('http')) {
          paymentProofUrl = text;
        } else if (text.includes('@') && text.includes('.')) {
          if (!email) email = text;
        } else if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.]{4,80}$/.test(text) && text.includes(' ')) {
          // Looks like a person's full name (letters and spaces)
          if (!fullName) fullName = text;
        } else if (/^\+?\d[\d\s-]{8,16}$/.test(text) && (text.startsWith('+') || text.startsWith('04') || text.startsWith('3'))) {
          // Looks like a phone number
          if (!phone) phone = text;
        } else if (/^[VvEeJjPp]-?\d{5,11}$/.test(text)) {
          // Looks like a cedula (e.g. V-12345678 or numeric ID)
          if (!cedula) cedula = text;
        } else if (/\d{3,}/.test(text) && text.length <= 40) {
          // Contains digits — could be payment reference or cedula
          if (!paymentReference) {
            paymentReference = text;
          } else if (!cedula) {
            cedula = text;
          }
        } else if (!fullName && text.length > 2) {
          fullName = text;
        } else if (!paymentReference) {
          paymentReference = text;
        }
      });
    }

    const formattedDate = r.createTime
      ? new Date(r.createTime).toLocaleString('es-ES')
      : new Date().toLocaleString('es-ES');

    return {
      id: truncate(deterministicId, 128),
      responseId: truncate(rawResponseId, 128),
      fullName: truncate(fullName || 'Participante registrado', 200),
      email: truncate(email || 'sin-correo@registrado.com', 200),
      phone: truncate(phone, 60),
      cedula: truncate(cedula, 60),
      registeredAt: truncate(formattedDate, 80),
      paymentStatus: 'pending',
      paymentReference: truncate(paymentReference, 150),
      paymentProofFileId: truncate(paymentProofFileId, 150),
      paymentProofUrl: truncate(paymentProofUrl, 500),
      rawAnswersJson: truncate(JSON.stringify(allFieldsSummary), 5000),
      verifiedAt: '',
      verifiedBy: '',
      ticketSentAt: '',
      generatedSlideId: '',
      isCheckedIn: false,
      checkedInAt: '',
      checkedInBy: '',
      ownerEmail: truncate(ownerEmail || 'pedroacosta182002@gmail.com', 200),
    };
  });

  return participants;
}
