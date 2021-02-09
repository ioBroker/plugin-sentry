const {PluginBase} = require('@iobroker/plugin-base');

class SentryPlugin extends PluginBase {

    /**
     * Register and initialize Sentry
     *
     * @param {Record<string, any>} pluginConfig plugin configuration from config files
     * @param {import('@iobroker/plugin-base').InitCallback} callback Will be called when done
     */
    async init(pluginConfig, callback) {
        this.reallyEnabled = false;
        if (!pluginConfig.enabled) {
            this.log.info('Sentry Plugin disabled by user');
            return callback && callback(null, false);
        }

        if (!pluginConfig.dsn) {
            return callback && callback(new Error('Invalid Sentry definition, no dsn provided. Disable error reporting'), false);
        }

        // turn off on Travis, Appveyor or GitHub actions or other Systems that set "CI=true"
        if (process.env.TRAVIS || process.env.APPVEYOR || process.env.CI) {
            this.log.info('Sentry Plugin disabled for this process because CI system detected');
            return callback && callback(null, true);
        }

        // turn off is parent Package contains disableDataReporting flag
        if (this.parentIoPackage && this.parentIoPackage.common && this.parentIoPackage.common.disableDataReporting) {
            this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on instance');
            return callback && callback(null, true);
        }

        // for Adapter also check host disableDataReporting flag
        if (this.pluginScope === this.SCOPES.ADAPTER && this.parentIoPackage && this.parentIoPackage.common && this.parentIoPackage.common.host) {
            let hostObj;
            try {
                hostObj = await this.getObjectAsync(`system.host.${this.parentIoPackage.common.host}`);
            } catch {
                // ignore
            }
            if (hostObj && hostObj.common && hostObj.common.disableDataReporting) {
                this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on host');
                return callback && callback(null, true);
            }
        } else if (this.pluginScope === this.SCOPES.CONTROLLER) {
            let hostObjName = this.parentNamespace;
            if (!hostObjName) {
                const posPluginInNamespace = this.pluginNamespace.indexOf('.plugins.sentry');
                if (posPluginInNamespace !== -1) {
                    hostObjName = this.pluginNamespace.substr(0,posPluginInNamespace);
                }
            }
            if (hostObjName) {
                let hostObj;
                try {
                    hostObj = await this.getObjectAsync(hostObjName);
                } catch {
                    // ignore
                }
                if (hostObj && hostObj.common && hostObj.common.disableDataReporting) {
                    this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on host');
                    return callback && callback(null, true);
                }
            }
        }

        let systemConfig;
        try {
            systemConfig = await this.getObjectAsync('system.config');
        } catch {
            // ignore
        }
        if (!systemConfig || !systemConfig.common || systemConfig.common.diag === 'none') {
            this.log.info('Sentry Plugin disabled for this process because sending of statistic data is disabled for the system');
            return callback && callback(null, true);
        }

        let uuidObj;
        try {
            uuidObj = await this.getObjectAsync('system.meta.uuid');
        } catch {
            // ignore
        }
        let uuid = uuidObj && uuidObj.native ? uuidObj.native.uuid : null;

        this._registerSentry(pluginConfig, uuid, callback);
    }

    _registerSentry(pluginConfig, uuid, callback) {
        this.reallyEnabled = true;
        // Require needed tooling
        this.Sentry = require('@sentry/node');
        const SentryIntegrations = require('@sentry/integrations');
        // By installing source map support, we get the original source
        // locations in error messages
        require('source-map-support').install();

        let sentryPathWhitelist = [];
        if (pluginConfig.pathWhitelist && Array.isArray(pluginConfig.pathWhitelist)) {
            sentryPathWhitelist = pluginConfig.pathWhitelist;
        }
        if (this.parentPackage.name && !sentryPathWhitelist.includes(this.parentPackage.name)) {
            sentryPathWhitelist.push(this.parentPackage.name);
        }
        let sentryPathBlacklist = [];
        if (pluginConfig.pathBlacklist && Array.isArray(pluginConfig.pathBlacklist)) {
            sentryPathBlacklist = pluginConfig.pathBlacklist;
        }
        let sentryErrorBlacklist = [];
        if (pluginConfig.errorBlacklist && Array.isArray(pluginConfig.errorBlacklist)) {
            sentryErrorBlacklist = pluginConfig.errorBlacklist;
        }
        if (!sentryErrorBlacklist.includes('SyntaxError')) {
            sentryErrorBlacklist.push('SyntaxError');
        }

        this.Sentry.init({
            release: this.parentPackage.name + '@' + this.parentPackage.version,
            dsn: pluginConfig.dsn,
            integrations: [
                new SentryIntegrations.Dedupe()
            ]
        });
        this.Sentry.configureScope(scope => {
            if (this.parentIoPackage && this.parentIoPackage.common) {
                scope.setTag('version', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
                if (this.parentIoPackage.common.installedFrom) {
                    scope.setTag('installedFrom', this.parentIoPackage.common.installedFrom);
                } else {
                    scope.setTag('installedFrom', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
                }
                if (this.settings && this.settings.controllerVersion) {
                    scope.setTag('jsControllerVersion', this.settings.controllerVersion);
                }
                scope.setTag('osPlatform', process.platform);
                scope.setTag('nodejsVersion', process.version);
                try {
                    scope.setTag('plugin-sentry', require('./package.json').version);
                } catch {
                    // ignore
                }
            }

            if (uuid) {
                scope.setUser({
                    id: uuid
                });
            }

            scope.addEventProcessor((event, hint) => {
                if (!this.isActive) return;
                // Try to filter out some events
                if (event.exception && event.exception.values && event.exception.values[0]) {
                    const eventData = event.exception.values[0];
                    // if error type is one from blacklist we ignore this error
                    if (eventData.type && sentryErrorBlacklist.includes(eventData.type)) {
                        return null;
                    }
                    // ignore EROFS, ENOSPC and such errors always
                    let errorText = (hint.originalException && hint.originalException.code) ? hint.originalException.code.toString() : ((hint.originalException && hint.originalException.message) ? hint.originalException.message.toString() : hint.originalException);

                    if (
                        typeof errorText === 'string' &&
                        (
                            errorText.includes('EROFS') || // Read only FS
                            errorText.includes('ENOSPC') || // No disk space available
                            errorText.includes('ENOMEM') || // No memory (RAM) available
                            errorText.includes('EIO') || // I/O error
                            errorText.includes('ENXIO') || // I/O error
                            errorText.includes('EMFILE') || // too many open files
                            errorText.includes('ENFILE') || // file table overflow
                            errorText.includes('EBADF') // Bad file descriptor
                        )
                    ) {
                        return null;
                    }
                    if (eventData.stacktrace && eventData.stacktrace.frames && Array.isArray(eventData.stacktrace.frames) && eventData.stacktrace.frames.length) {
                        // if last exception frame is from an nodejs internal method we ignore this error
                        if (eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename && (eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename.startsWith('internal/') || eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename.startsWith('Module.'))) {
                            return null;
                        }
                        // Check if any entry is whitelisted from pathWhitelist
                        const whitelisted = eventData.stacktrace.frames.find(frame => {
                            if (frame.function && frame.function.startsWith('Module.')) {
                                return false;
                            }
                            if (frame.filename && frame.filename.startsWith('internal/')) {
                                return false;
                            }
                            if (frame.filename && !sentryPathWhitelist.find(path => path && path.length && frame.filename.includes(path))) {
                                return false;
                            }
                            if (frame.filename && sentryPathBlacklist.find(path => path && path.length && frame.filename.includes(path))) {
                                return false;
                            }
                            return true;
                        });
                        if (!whitelisted) {
                            return null;
                        }
                    }
                }

                return event;
            });

            callback && callback(null, true);
        });
    }

    /**
     * Return Sentry object. This can be used to send own Messages or such
     * @returns {object} Sentry object
     */
    getSentryObject() {
        return this.Sentry;
    }
}

module.exports = SentryPlugin;