import { Router, Request, Response } from 'express';

const router = Router();

router.post('/chat', (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: 'Please type a message so I can help you 😊' });
  }

  const text = message.toLowerCase();
  let reply = '';

  if (/(hi|hello|hey)/.test(text)) {
    reply = 'Hello! 👋 How can I help you today?';
  } 
  else if (/(donate|donation|contribute)/.test(text)) {
    reply = 'You can donate online using bank details or offline by visiting the NGO address.';
  }
  else if (/(pay|payment|bank|money|transfer)/.test(text)) {
    reply = 'QR payments are not available. For online donations, use bank account details shown on the donation page. For offline donations, visit the NGO address.';
  }
  else if (/(pickup|collect|offline|address)/.test(text)) {
    reply = 'For offline donations, NGOs will collect items from your provided pickup address or you can visit them directly.';
  }
  else if (/(signup|register)/.test(text)) {
    reply = 'Click Signup, fill your details, and choose Donor or NGO.';
  }
  else if (/(login|sign in)/.test(text)) {
    reply = 'Click Login and enter your registered credentials.';
  }
  else if (/(dashboard|track)/.test(text)) {
    reply = 'Your dashboard helps you track donations, pickups, and requests.';
  }
  else if (/(help|support|problem|issue)/.test(text)) {
    reply = 'I can assist with donations, payment methods, pickups, and account issues.';
  }
  else {
    reply = 'Sorry, I didn’t understand that. Try asking about donation, payment, pickup, or signup.';
  }

  res.json({ reply });
});

export default router;
