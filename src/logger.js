import { pino } from "pino";

let fileLogger;

/**
 * Initialize the standard out and file loggers.
 * @param directory the directory in which to create the log file
 * @param quiet true if the standard output should be minimalized to errors only
 * @param logLevel the file log level
 */
function loggerInit(directory, quiet = false, logLevel = 'info') {
    let destination = directory + '/log_' + (new Date()).toISOString() + '.txt';
    fileLogger = pino(pino.transport({
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    destination: destination,
                    colorize: false,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname'
                },
            }
        ]
    }));
    fileLogger.level = logLevel;
    if (quiet) {
        console.log = function(){};
        console.info = function(){};
        console.debug = function(){};
    }
}

function log(level, text, options = {toConsole: false}) {
    let detail = options.detail;
    if (detail) {
        if (options.toConsole) {
            console.log(text + ': ' + yellow(detail));
        }
        fileLogger[level](removeYellow(text) + ': ' + removeYellow(detail));
    } else {
        if (options.toConsole) {
            console.log(text);
        }
        // remove any yellow which may have been added by the caller
        fileLogger[level](removeYellow(text));
    }
}

function loggerInfo(text, options = {toConsole: false}) {
    log('info', text, options);
}

function loggerDebug(text, options = {toConsole: false}) {
    log('debug', text, options);
}

function loggerError(text) {
    console.error(text);
    fileLogger.error(removeYellow(text));
}

function yellow(text) {
    return '\x1b[33m' + text + '\x1b[0m';
}

function removeYellow(text) {
    let withoutYellow = text.replaceAll(/\x1b\[33m/g, '');
    return withoutYellow.replaceAll(/\x1b\[0m/g, '');
}

export { loggerInit, loggerInfo, loggerError, loggerDebug, yellow };