const {PluginBase} = require('@iobroker/plugin-base');

class SentryPlugin extends PluginBase {

    /**
     * Register and initialize Sentry
     *
     * @param {Record<string, any>} pluginConfig plugin configuration from config files
     * @param {import('@iobroker/plugin-base').InitCallback} callback Will be called when done
     */
    init(pluginConfig, callback) {
        if (!pluginConfig.enabled) {
            this.log.info('Sentry Plugin disabled by user');
            return void callback(null, false);
        }

        if (!pluginConfig.dsn) {
            return void callback('Invalid Sentry definition, no dsn provided. Disable error reporting', false);
        }
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
            scope.setTag('version', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
            if (this.parentIoPackage.common.installedFrom) {
                scope.setTag('installedFrom', this.parentIoPackage.common.installedFrom);
            }
            else {
                scope.setTag('installedFrom', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
            }
            scope.addEventProcessor((event, _hint) => {
                if (!this.isActive) return;
                // Try to filter out some events
                if (event.exception && event.exception.values && event.exception.values[0]) {
                    const eventData = event.exception.values[0];
                    // if error type is one from blacklist we ignore this error
                    if (eventData.type && sentryErrorBlacklist.includes(eventData.type)) {
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
                            return true;
                        });
                        if (!whitelisted) {
                            return null;
                        }
                    }
                }

                return event;
            });

            this.getObject('system.config', (err, obj) => {
                if (obj && obj.common && obj.common.diag) {
                    this.getObject('system.meta.uuid', (err, obj) => {
                        // create uuid
                        if (!err  && obj) {
                            this.Sentry.configureScope(scope => {
                                scope.setUser({
                                    id: obj.native.uuid
                                });
                            });
                        }
                        callback && callback(null, true);
                    });
                }
                else {
                    callback && callback(null, true);
                }
            });
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