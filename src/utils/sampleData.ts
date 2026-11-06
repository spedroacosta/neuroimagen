import { Participant, EventConfig } from '../types';

export const INITIAL_EVENT_CONFIG: EventConfig = {
  eventName: 'Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos',
  eventDate: '5 de Diciembre, 2026',
  eventTime: '08:00 AM - 05:00 PM',
  eventLocation: 'Auditorio Principal de Medicina',
  googleFormUrl: 'https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit',
  googleSlidesUrl: 'https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit?slide=id.p#slide=id.p',
  organizerEmail: 'promocion106@medicina.edu',
  organizerName: 'Comité Promoción 106 de Médicos Cirujanos',
  customEmailSubject: 'Confirmación de Pago - Taller de Neuroimagen',
  customEmailBody: `Estimado(a) {{NOMBRE}},\n\nLe confirmamos que su pago para el Taller de Neuroimagen, el arte de diagnosticar a tiempo (Promoción 106 de Médicos Cirujanos) ha sido verificado satisfactoriamente.\n\nAdjunto encontrará su comprobante de entrada con su código QR personal para el ingreso el día del evento.\n\nFecha: 5 de Diciembre, 2026\nLugar: Auditorio Principal de Medicina\n\nPor favor presente el código QR desde su celular en el control de acceso.\n\nAtentamente,\nPromoción 106 de Médicos Cirujanos`,
  bgGradient: 'from-slate-900 to-slate-950',
};

// Start with empty array by default or clean records when connected to live Google Forms
export const SAMPLE_PARTICIPANTS: Participant[] = [];
