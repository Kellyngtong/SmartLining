import cron from 'node-cron';
import { logger } from '../config/logger';
import { smtpConfigured } from '../services/mail.service';
import { enviarRecordatorios, enviarReviews } from '../services/reserva-notifier.service';

let iniciado = false;

/**
 * Programador de comunicaciones time-based (recordatorios + reseñas Google).
 * Cada 15 minutos. Una sola instancia de backend: sin locks distribuidos.
 * Si se escala a N instancias, migrar a cola con lock (documentado).
 */
export function startComunicacionesScheduler(): void {
  if (iniciado) return;
  iniciado = true;
  cron.schedule('*/15 * * * *', async () => {
    try {
      if (!smtpConfigured()) {
        logger.debug('[comunicaciones] SMTP no configurado, barrido omitido');
        return;
      }
      const [rec, rev] = await Promise.all([enviarRecordatorios(), enviarReviews()]);
      if (rec.enviados + rec.fallos + rev.enviados + rev.fallos > 0) {
        logger.info(`[comunicaciones] recordatorios: ${rec.enviados} ok/${rec.fallos} fallo; reviews: ${rev.enviados} ok/${rev.fallos} fallo`);
      }
    } catch (e) {
      logger.warn('[comunicaciones] barrido falló:', e);
    }
  });
  logger.info('📧 Programador de comunicaciones iniciado (cada 15 min)');
}
