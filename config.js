// Configuración de la página link en bio de FlujoxAI.
window.FLUJO_CONFIG = {
  // Flujo de n8n que recibe leads y citas y los pasa al Gestor.
  bookingWebhook: 'https://chatbot-n8n.q5woda.easypanel.host/webhook/link-bio',
  // Horas ocupadas (sin datos personales) que publica el Gestor.
  availabilityUrl: 'https://gestor.flujoxai.com/api/public/availability?days=21',
  // Webhook de chat de n8n (Chat Trigger). Vacío = respuestas guiadas + WhatsApp.
  chatWebhook: 'https://chatbot-n8n.q5woda.easypanel.host/webhook/166b98cb-b0a1-40ae-ac14-39833123a3ab/chat',
  whatsapp: '18492597719',
  // Santo Domingo no usa horario de verano: siempre UTC-4.
  utcOffset: '-04:00',
  utcOffsetMinutes: -240,
  workStart: '12:00',
  workEnd: '18:00',
  slotMinutes: 30,
  minNoticeHours: 2,
  businessDaysAhead: 10,
};
