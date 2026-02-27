import { environment } from './environment';
import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = logLevels[environment.LOG_LEVEL as LogLevel] || 1;

class Logger {
  private timestamp(): string {
    return new Date().toISOString();
  }

  private ensureLogFile() {
    try {
      const dir = path.join(__dirname, '..', '..', 'logs');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return path.join(dir, 'backend.log');
    } catch (e) {
      return null;
    }
  }

  private writeToFile(level: string, message: string, data?: unknown) {
    try {
      const file = this.ensureLogFile();
      if (!file) return;
      const line = `${this.timestamp()} [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
      fs.appendFileSync(file, line);
    } catch {
      // ignore file write errors in dev
    }
  }

  debug(message: string, data?: unknown): void {
    if (logLevels.debug >= currentLogLevel) {
      console.log(
        `${colors.cyan}[DEBUG]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
      this.writeToFile('DEBUG', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (logLevels.info >= currentLogLevel) {
      console.log(
        `${colors.green}[INFO]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
      this.writeToFile('INFO', message, data);
    }
  }

  warn(message: string, data?: unknown): void {
    if (logLevels.warn >= currentLogLevel) {
      console.log(
        `${colors.yellow}[WARN]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
      this.writeToFile('WARN', message, data);
    }
  }

  error(message: string, error?: unknown): void {
    if (logLevels.error >= currentLogLevel) {
      console.error(
        `${colors.red}[ERROR]${colors.reset} ${this.timestamp()} ${message}`,
        error || ''
      );
      this.writeToFile('ERROR', message, error);
    }
  }
}

export const logger = new Logger();
