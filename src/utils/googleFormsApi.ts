import { Participant } from '../types';

export const FORM_ID = '1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc';

/**
 * Fetches form responses live from Google Forms API
 */
export async function fetchLiveFormResponses(accessToken: string): Promise<Participant[]> {
  try {
    const url = `https://forms.googleapis.com/v1/forms/${FORM_ID}/responses`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Forms API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const responses = data.responses || [];

    const participants: Participant[] = responses.map((r: any, idx: number) => {
      let fullName = 'Participante';
      let email = r.respondentEmail || '';
      let phone = '';
      let tier: any = 'General';
      let amount = 0;
      let proofUrl = '';

      // Parse answers
      if (r.answers) {
        Object.values(r.answers).forEach((ans: any) => {
          const textValues = ans.textAnswers?.answers?.map((a: any) => a.value) || [];
          const text = textValues.join(' ');
          if (!email && text.includes('@')) {
            email = text;
          } else if (fullName === 'Participante' && text.length > 2 && !text.startsWith('http')) {
            fullName = text;
          } else if (text.startsWith('http')) {
            proofUrl = text;
          }
        });
      }

      return {
        id: `NEURO-${1000 + idx}`,
        fullName: fullName || `Médico Cirujano ${idx + 1}`,
        email: email || `asistente${idx + 1}@medicina.edu`,
        phone: phone || '+57 300 000 0000',
        tier: tier,
        registeredAt: r.createTime ? new Date(r.createTime).toLocaleString('es-ES') : new Date().toLocaleString('es-ES'),
        paymentStatus: 'pending',
        paymentAmount: amount,
        paymentProofUrl: proofUrl || undefined,
        paymentReference: `FORM-${r.responseId ? r.responseId.substring(0, 8) : idx}`,
        isCheckedIn: false,
      };
    });

    return participants;
  } catch (err) {
    console.error('Error fetching Google Forms responses:', err);
    throw err;
  }
}
