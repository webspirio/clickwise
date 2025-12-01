/**
 * Centralized logging utility for Clickwise Analytics
 *
 * Features:
 * - Environment-aware logging (disabled in production)
 * - Structured log messages with timestamps
 * - Support for different log levels
 * - Sanitized error reporting (no sensitive data)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
    context?: string;
    data?: Record<string, any>;
}

class Logger {
    private isDebugMode: boolean;
    private prefix: string;

    constructor() {
        // Enable debug mode only in development
        // Vite automatically sets import.meta.env.DEV based on NODE_ENV
        this.isDebugMode = import.meta.env.DEV;
        this.prefix = '[Clickwise]';
    }

    /**
     * Check if logging is enabled for the given level
     */
    private shouldLog(level: LogLevel): boolean {
        if (level === 'error') return true; // Always log errors
        return this.isDebugMode;
    }

    /**
     * Format log message with context
     */
    private formatMessage(message: string, options?: LogOptions): string {
        const context = options?.context ? `[${options.context}]` : '';
        return `${this.prefix}${context} ${message}`;
    }

    /**
     * Sanitize data before logging (remove sensitive information)
     */
    private sanitizeData(data: any): any {
        if (!data || typeof data !== 'object') return data;

        const sensitiveKeys = ['api_key', 'apiKey', 'password', 'secret', 'token', 'nonce', 'restNonce'];
        const sanitized = { ...data };

        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Debug level logging (only in development)
     */
    debug(message: string, options?: LogOptions): void {
        if (!this.shouldLog('debug')) return;

        const formatted = this.formatMessage(message, options);
        if (options?.data) {
            console.debug(formatted, this.sanitizeData(options.data));
        } else {
            console.debug(formatted);
        }
    }

    /**
     * Info level logging (only in development)
     */
    info(message: string, options?: LogOptions): void {
        if (!this.shouldLog('info')) return;

        const formatted = this.formatMessage(message, options);
        if (options?.data) {
            console.log(formatted, this.sanitizeData(options.data));
        } else {
            console.log(formatted);
        }
    }

    /**
     * Warning level logging (only in development)
     */
    warn(message: string, options?: LogOptions): void {
        if (!this.shouldLog('warn')) return;

        const formatted = this.formatMessage(message, options);
        if (options?.data) {
            console.warn(formatted, this.sanitizeData(options.data));
        } else {
            console.warn(formatted);
        }
    }

    /**
     * Error level logging (always logged)
     */
    error(message: string, error?: Error | unknown, options?: LogOptions): void {
        if (!this.shouldLog('error')) return;

        const formatted = this.formatMessage(message, options);

        if (error instanceof Error) {
            console.error(formatted, {
                message: error.message,
                stack: this.isDebugMode ? error.stack : undefined,
                ...options?.data && { data: this.sanitizeData(options.data) }
            });
        } else if (error) {
            console.error(formatted, error, options?.data && this.sanitizeData(options.data));
        } else {
            console.error(formatted, options?.data && this.sanitizeData(options.data));
        }
    }

    /**
     * Log API request (sanitized)
     */
    apiRequest(method: string, url: string, data?: any): void {
        if (!this.isDebugMode) return;

        this.debug(`API ${method} ${url}`, {
            context: 'API',
            data: data ? this.sanitizeData(data) : undefined
        });
    }

    /**
     * Log API response (sanitized)
     */
    apiResponse(method: string, url: string, status: number, data?: any): void {
        if (!this.isDebugMode) return;

        const level = status >= 400 ? 'error' : 'debug';
        const message = `API ${method} ${url} → ${status}`;

        if (level === 'error') {
            this.error(message, undefined, {
                context: 'API',
                data: data ? this.sanitizeData(data) : undefined
            });
        } else {
            this.debug(message, {
                context: 'API',
                data: data ? this.sanitizeData(data) : undefined
            });
        }
    }

    /**
     * Log SDK initialization
     */
    sdkInit(name: string, config: any): void {
        if (!this.isDebugMode) return;

        this.info(`${name} SDK initializing`, {
            context: 'SDK',
            data: this.sanitizeData(config)
        });
    }

    /**
     * Log SDK success
     */
    sdkSuccess(name: string): void {
        if (!this.isDebugMode) return;

        this.info(`${name} SDK initialized successfully`, {
            context: 'SDK'
        });
    }

    /**
     * Log SDK error
     */
    sdkError(name: string, error: Error | unknown): void {
        this.error(`${name} SDK initialization failed`, error, {
            context: 'SDK'
        });
    }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export type { LogLevel, LogOptions };
