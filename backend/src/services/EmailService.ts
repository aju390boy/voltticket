import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';

const IS_DEV = process.env.NODE_ENV !== 'production';
const HAS_REAL_KEY = (process.env.SENDGRID_API_KEY || '').startsWith('SG.');

// Only initialize SendGrid with the real key in production or when key is valid
if (HAS_REAL_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

export const EmailService = {
  async sendTicketEmail(params: {
    to: string;
    name: string;
    eventTitle: string;
    artist: string;
    venue: string;
    date: string;
    seats: Array<{ label: string; section: string; tier: string }>;
    orderId: string;
    totalAmount: number;
  }) {
    const qrData = JSON.stringify({ orderId: params.orderId, v: 1 });
    const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 256 });

    // ─── DEV MODE: log to console instead of sending real email ───────────
    if (IS_DEV && !HAS_REAL_KEY) {
      logger.info('📧 [DEV] Ticket email (not sent — add real SENDGRID_API_KEY to send)', {
        to: params.to,
        subject: `Your tickets for ${params.eventTitle} — VoltTicket`,
        orderId: params.orderId,
        seats: params.seats.map((s) => s.label),
        totalAmount: params.totalAmount,
      });
      return; // Skip actual sending
    }

    const seatsHtml = params.seats
      .map((s) => `<tr><td>${s.section}</td><td>${s.label}</td><td>${s.tier}</td></tr>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>
        body { font-family: 'Segoe UI', sans-serif; background: #0a0a1a; color: #e8e8ff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 40px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .body { background: #111128; padding: 32px; }
        .ticket-card { background: #1a1a3a; border: 1px solid #7c3aed40; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .qr-section { text-align: center; margin: 24px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #2a2a4a; color: #e8e8ff; }
        th { color: #a78bfa; font-weight: 600; }
        .amount { font-size: 24px; font-weight: bold; color: #a78bfa; margin: 16px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ VoltTicket</h1>
            <p style="color: #c4b5fd; margin: 8px 0 0">Your tickets are confirmed!</p>
          </div>
          <div class="body">
            <p>Hi ${params.name},</p>
            <p>Your booking is confirmed. Here are your ticket details:</p>
            <div class="ticket-card">
              <h2 style="color: #a78bfa; margin: 0 0 8px">${params.eventTitle}</h2>
              <p style="margin: 4px 0">🎤 ${params.artist}</p>
              <p style="margin: 4px 0">📍 ${params.venue}</p>
              <p style="margin: 4px 0">📅 ${params.date}</p>
            </div>
            <table>
              <tr><th>Section</th><th>Seat</th><th>Tier</th></tr>
              ${seatsHtml}
            </table>
            <p class="amount">Total: $${params.totalAmount.toFixed(2)}</p>
            <div class="qr-section">
              <p style="color: #a78bfa; margin-bottom: 12px">Scan at the venue entrance</p>
              <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200" style="border-radius: 8px;" />
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Order ID: ${params.orderId}</p>
          </div>
          <div class="footer">
            <p>VoltTicket — The fastest ticket platform on earth ⚡</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sgMail.send({
        to: params.to,
        from: {
          email: process.env.FROM_EMAIL || 'tickets@volttticket.com',
          name: process.env.FROM_NAME || 'VoltTicket',
        },
        subject: `Your tickets for ${params.eventTitle} — VoltTicket`,
        html,
      });
      logger.info(`✉️  E-ticket email sent to ${params.to}`);
    } catch (error) {
      logger.error('Failed to send ticket email:', error);
      throw error;
    }
  },

  async sendWaitlistNotification(params: {
    to: string;
    name: string;
    eventTitle: string;
    eventId: string;
  }) {
    // ─── DEV MODE: log instead of send ────────────────────────────────────
    if (IS_DEV && !HAS_REAL_KEY) {
      logger.info('📧 [DEV] Waitlist notification (not sent)', {
        to: params.to,
        eventTitle: params.eventTitle,
      });
      return;
    }

    await sgMail.send({
      to: params.to,
      from: {
        email: process.env.FROM_EMAIL || 'tickets@volttticket.com',
        name: process.env.FROM_NAME || 'VoltTicket',
      },
      subject: `Seats available for ${params.eventTitle} — Act fast! ⚡`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed;">⚡ Seats Available!</h2>
          <p>Hi ${params.name},</p>
          <p>Good news! Seats have become available for <strong>${params.eventTitle}</strong>.</p>
          <p>Act fast — they won't last long!</p>
          <a href="${process.env.CLIENT_URL}/events/${params.eventId}" 
             style="display:inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); 
                    color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Book Now
          </a>
        </div>
      `,
    });
    logger.info(`✉️  Waitlist notification sent to ${params.to}`);
  },
};
