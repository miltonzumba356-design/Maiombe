import cron from 'node-cron';
import { AutomationService } from '../services/automation.service';
import { logger } from '../utils/logger';

const automation = new AutomationService();

export function startDailyNotificationJob() {
  // Corre todos os dias às 09:00
  cron.schedule('0 9 * * *', async () => {
    logger.info('[Job] A executar envio automático de notificações...');
    try {
      const stats = await automation.runDaily();
      logger.info(`[Job] Concluído: ${stats.sent} enviados, ${stats.skipped} sem contacto, ${stats.errors} erros`);
    } catch (e: any) {
      logger.error(`[Job] Falha no job de notificações: ${e.message}`);
    }
  }, { timezone: 'Africa/Luanda' });

  logger.info('[Job] Job diário de notificações agendado para 09:00 (Africa/Luanda)');
}
