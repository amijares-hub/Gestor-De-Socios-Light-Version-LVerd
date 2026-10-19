// api/send-panic-whatsapp.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { workerName, location, timestamp, recipients } = req.body;

  const alertMessage = 
`🚨 *¡ALERTA CRÍTICA DE SEGURIDAD - SVADHISTHANA!* 🚨
--------------------------------------
Se ha activado el *BOTÓN DE PÁNICO* en el local.

📍 *Ubicación:* ${location || 'Dispensario'}
👤 *Activado por:* ${workerName || 'Empleado'}
⏰ *Hora:* ${new Date(timestamp).toLocaleTimeString('es-ES')}

_Por favor, revisad cámaras de seguridad o acudid de inmediato._`;

  // Ejemplo con Twilio WhatsApp API (o tu proveedor preferido)
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    // Si aún no has configurado las credenciales de Twilio en Vercel, registramos el log de simulación
    console.log(`[SIMULACIÓN WHATSAPP] Enviando a ${recipients?.length} destinatarios:\n${alertMessage}`);
    return res.status(200).json({ status: 'simulated', count: recipients?.length });
  }

  try {
    const sendPromises = recipients.map(contact => {
      const formattedPhone = contact.phone.startsWith('whatsapp:') ? contact.phone : `whatsapp:${contact.phone}`;
      return fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_FROM,
          To: formattedPhone,
          Body: alertMessage
        })
      });
    });

    await Promise.all(sendPromises);
    return res.status(200).json({ success: true, delivered: recipients.length });
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return res.status(500).json({ error: error.message });
  }
}
