export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  component?: string;
  stack?: string;
}

class Logger {
  public isEnabled: boolean;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    const stored = localStorage.getItem('app_logger_enabled');
    this.isEnabled = stored !== 'false'; // Default to true if not present
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('app_logger_enabled', String(enabled));
    if (enabled) {
      this.info('Logger enabled');
    } else {
      this.info('Logger disabled');
    }
  }

  log(level: 'info' | 'warn' | 'error', message: string, component?: string, stack?: string) {
    if (!this.isEnabled) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      stack,
    };
    
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    // Also output to console for dev mode
    console[level](`[${level.toUpperCase()}] ${component ? `[${component}] ` : ''}${message}`, stack || '');
  }

  error(err: Error | unknown, component?: string) {
    let message = 'Unknown error';
    let stack = '';
    
    if (err instanceof Error) {
      message = err.message;
      stack = err.stack || '';
    } else if (typeof err === 'string') {
      message = err;
    } else {
      try {
        message = JSON.stringify(err);
      } catch(e) {
        message = 'Unstringifiable error';
      }
    }
    
    this.log('error', message, component, stack);
  }

  info(message: string, component?: string) {
    this.log('info', message, component);
  }

  warn(message: string, component?: string) {
    this.log('warn', message, component);
  }

  clear() {
    this.logs = [];
    this.info('Logs cleared');
  }

  getLogs() {
    return [...this.logs];
  }

  download() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.logs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `app_logs_${new Date().getTime()}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.logs, null, 2));
      return true;
    } catch (e) {
      this.error(e, 'Logger.copyToClipboard');
      return false;
    }
  }
}

export const logger = new Logger();
