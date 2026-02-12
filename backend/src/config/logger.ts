import { environment } from './environment';

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

  debug(message: string, data?: unknown): void {
    if (logLevels.debug >= currentLogLevel) {
      console.log(
        `${colors.cyan}[DEBUG]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
    }
  }

  info(message: string, data?: unknown): void {
    if (logLevels.info >= currentLogLevel) {
      console.log(
        `${colors.green}[INFO]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
    }
  }

  warn(message: string, data?: unknown): void {
    if (logLevels.warn >= currentLogLevel) {
      console.log(
        `${colors.yellow}[WARN]${colors.reset} ${this.timestamp()} ${message}`,
        data || ''
      );
    }
  }

  error(message: string, error?: unknown): void {
    if (logLevels.error >= currentLogLevel) {
      console.error(
        `${colors.red}[ERROR]${colors.reset} ${this.timestamp()} ${message}`,
        error || ''
      );
    }
  }
}

export const logger = new Logger();
