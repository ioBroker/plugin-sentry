const {PluginBase} = require('@iobroker/plugin-base');

class SentryPlugin extends PluginBase {

    constructor(settings) {
        super(settings);
    }

    /**
     * Register and initialize Sentry
     *
     * @param pluginConfig {object} plugin configuration from config files
     * @param callback {function} callback when done, signature "(err, initSuccessful)". On err or initSuccessful===false the plugin instance will be discarded
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
        this.SentryIntegrations = require('@sentry/integrations');
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
                new this.SentryIntegrations.Dedupe()
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
            scope.addEventProcessor(function(event, hint) {
                // Try to filter out some events
                if (event && event.metadata) {
                    if (event.metadata.function && event.metadata.function.startsWith('Module.')) {
                        return null;
                    }
                    if (event.metadata.type && sentryErrorBlacklist.includes(event.metadata.type)) {
                        return null;
                    }
                    if (event.metadata.filename && !sentryPathWhitelist.find(path => path && path.length && event.metadata.filename.includes(path))) {
                        return null;
                    }
                    if (event.exception && event.exception.values && event.exception.values[0] && event.exception.values[0].stacktrace && event.exception.values[0].stacktrace.frames) {
                        for (let i = 0; i < (event.exception.values[0].stacktrace.frames.length > 5 ? 5 : event.exception.values[0].stacktrace.frames.length); i++) {
                            let foundWhitelisted = false;
                            if (event.exception.values[0].stacktrace.frames[i].filename && sentryPathWhitelist.find(path => path && path.length && event.exception.values[0].stacktrace.frames[i].filename.includes(path))) {
                                foundWhitelisted = true;
                                break;
                            }
                            if (!foundWhitelisted) {
                                return null;
                            }
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