import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import logger from '../utils/logger';
import { initWhatsAppBot } from './whatsapp-bot.service';

type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticated' | 'ready' | 'error';

class WhatsAppService {
  private client: Client | null = null;
  private qrString: string | null = null;
  private status: WhatsAppStatus = 'disconnected';
  readonly isServerless: boolean;

  constructor() {
    this.isServerless = !!process.env.VERCEL;
  }

  initialize(): void {
    if (this.isServerless) {
      logger.warn('WhatsApp service disabled on serverless environment (Vercel)');
      return;
    }

    this.status = 'connecting';

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    this.client.on('qr', (qr) => {
      this.qrString = qr;
      this.status = 'qr_ready';
      logger.info('WhatsApp: QR code generado. Escanéalo con tu teléfono.');
    });

    this.client.on('authenticated', () => {
      this.qrString = null;
      this.status = 'authenticated';
      logger.info('WhatsApp: autenticado correctamente');
    });

    this.client.on('ready', () => {
      this.status = 'ready';
      logger.info('WhatsApp: cliente listo para enviar mensajes');
      initWhatsAppBot(this.client);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      logger.warn(`WhatsApp: desconectado — ${reason}`);
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'error';
      logger.error(`WhatsApp: fallo de autenticación — ${msg}`);
    });

    this.client.initialize().catch((err) => {
      this.status = 'error';
      logger.error('WhatsApp: error al inicializar', err);
    });
  }

  getStatus(): WhatsAppStatus {
    return this.status;
  }

  async getQRCode(): Promise<string | null> {
    if (!this.qrString) return null;
    return qrcode.toDataURL(this.qrString);
  }

  /**
   * Normaliza un número de teléfono al formato de WhatsApp.
   * Ejemplo: "5512345678" → "525512345678@c.us"
   */
  formatPhone(phone: string, defaultCountryCode = '52'): string {
    let digits = phone.replace(/\D/g, '');

    // 10 dígitos mexicanos sin código de país
    if (digits.length === 10) {
      digits = `${defaultCountryCode}${digits}`;
    }

    // Algunos números mexicanos tienen prefijo 521 (viejo formato móvil)
    // WhatsApp usa 52 + 10 dígitos
    if (digits.length === 13 && digits.startsWith('521')) {
      digits = `52${digits.slice(3)}`;
    }

    return `${digits}@c.us`;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.client || this.status !== 'ready') {
      throw new Error(`Cliente de WhatsApp no disponible. Estado actual: ${this.status}`);
    }

    const chatId = this.formatPhone(phone);

    // Verifica que el número exista en WhatsApp antes de intentar enviar
    const numberId = await this.client.getNumberId(chatId);
    if (!numberId) {
      throw Object.assign(new Error(`El número ${phone} no está registrado en WhatsApp`), { code: 'NOT_ON_WHATSAPP' });
    }

    await this.client.sendMessage(numberId._serialized, message);
  }

  async sendBulkMessages(
    recipients: Array<{ nombre: string; telefono: string }>,
    message: string | ((nombre: string) => string)
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] as string[] };

    for (const recipient of recipients) {
      try {
        const msg = typeof message === 'function' ? message(recipient.nombre) : message;
        await this.sendMessage(recipient.telefono, msg);
        result.sent++;
        // Pausa de 1s entre mensajes para evitar bloqueos de WhatsApp
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        result.failed++;
        result.errors.push(`${recipient.nombre} (${recipient.telefono}): ${err.message}`);
        logger.warn(`WhatsApp: no se pudo enviar a ${recipient.nombre} — ${err.message}`);
      }
    }

    return result;
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.status = 'disconnected';
    }
  }
}

export const whatsappService = new WhatsAppService();
