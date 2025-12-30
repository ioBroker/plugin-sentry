"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_base_1 = require("@iobroker/plugin-base");
class SentryPlugin extends plugin_base_1.PluginBase {
    /** The Sentry instance */
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    Sentry;
    /** If plugin is enabled after all checks */
    reallyEnabled = false;
    /**
     * Register and initialize Sentry
     *
     * @param pluginConfig plugin configuration from config files
     */
    async init(pluginConfig) {
        if (!pluginConfig.enabled) {
            this.log.info('Sentry Plugin disabled by user');
            throw new Error('Sentry Plugin disabled by user');
        }
        if (!pluginConfig.dsn) {
            throw new Error('Invalid Sentry definition, no dsn provided. Disable error reporting');
        }
        // turn off on Travis, Appveyor or GitHub actions or other Systems that set "CI=true"
        if (process.env.TRAVIS || process.env.APPVEYOR || process.env.CI) {
            throw new Error('Sentry Plugin disabled for this process because CI system detected');
        }
        // turn off if parent Package contains disableDataReporting flag
        // @ts-expect-error fixed in js-controller
        if (this.parentIoPackage?.common?.disableDataReporting) {
            this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on instance');
            throw new Error('Sentry Plugin disabled for this process because data reporting is disabled on instance');
        }
        // for Adapter also check the host disableDataReporting flag
        if (this.pluginScope === this.SCOPES.ADAPTER && this.parentIoPackage?.common?.host) {
            let hostObj;
            try {
                hostObj = await this.getObject(`system.host.${this.parentIoPackage.common.host}`);
            }
            catch {
                // ignore
            }
            if (hostObj?.common?.disableDataReporting) {
                this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on host');
                throw new Error('Sentry Plugin disabled for this process because data reporting is disabled on host');
            }
        }
        else if (this.pluginScope === this.SCOPES.CONTROLLER) {
            let hostObjName = this.parentNamespace;
            if (!hostObjName) {
                const posPluginInNamespace = this.pluginNamespace.indexOf('.plugins.sentry');
                if (posPluginInNamespace !== -1) {
                    hostObjName = this.pluginNamespace.substring(0, posPluginInNamespace);
                }
            }
            if (hostObjName) {
                let hostObj;
                try {
                    hostObj = (await this.getObject(hostObjName));
                }
                catch {
                    // ignore
                }
                if (hostObj?.common?.disableDataReporting) {
                    this.log.info('Sentry Plugin disabled for this process because data reporting is disabled on host');
                    throw new Error('Sentry Plugin disabled for this process because data reporting is disabled on host');
                }
            }
        }
        let systemConfig;
        try {
            systemConfig = await this.getObject('system.config');
        }
        catch {
            // ignore
        }
        if (!systemConfig?.common || systemConfig.common.diag === 'none') {
            this.log.info('Sentry Plugin disabled for this process because sending of statistic data is disabled for the system');
            throw new Error('Sentry Plugin disabled for this process because sending of statistic data is disabled for the system');
        }
        let uuidObj;
        try {
            uuidObj = await this.getObject('system.meta.uuid');
        }
        catch {
            // ignore
        }
        const uuid = uuidObj?.native?.uuid || null;
        await this._registerSentry(pluginConfig, uuid);
    }
    async _registerSentry(pluginConfig, uuid) {
        this.reallyEnabled = true;
        // Require needed tooling
        this.Sentry = await import('@sentry/node');
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
            release: `${this.parentPackage.name}@${this.parentPackage.version}`,
            dsn: pluginConfig.dsn,
            integrations: [new SentryIntegrations.Dedupe()],
        });
        const scope = this.Sentry.getCurrentScope();
        if (this.parentIoPackage && this.parentIoPackage.common) {
            scope.setTag('version', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
            if (this.parentIoPackage.common.installedFrom) {
                scope.setTag('installedFrom', this.parentIoPackage.common.installedFrom);
            }
            else {
                scope.setTag('installedFrom', this.parentIoPackage.common.installedVersion || this.parentIoPackage.common.version);
            }
            if (this.settings && this.settings.controllerVersion) {
                scope.setTag('jsControllerVersion', this.settings.controllerVersion);
            }
            scope.setTag('osPlatform', process.platform);
            scope.setTag('nodejsVersion', process.version);
            try {
                scope.setTag('plugin-sentry', require('./package.json').version);
            }
            catch {
                // ignore
            }
            if (this.iobrokerConfig) {
                if (this.iobrokerConfig.objects?.type) {
                    this.Sentry.setTag('objectDBType', this.iobrokerConfig.objects.type);
                }
                if (this.iobrokerConfig.states?.type) {
                    this.Sentry.setTag('statesDBType', this.iobrokerConfig.states.type);
                }
            }
        }
        if (uuid) {
            this.Sentry.setUser({ id: uuid });
        }
        const scope = this.Sentry.getCurrentScope?.();
        if (scope) {
            scope.addEventProcessor((event, hint) => {
                if (!this.isActive) {
                    return;
                }
                // Try to filter out some events
                if (event.exception?.values?.[0]) {
                    const eventData = event.exception.values[0];
                    // if the error type is one from the blacklist, we ignore this error
                    if (eventData.type && sentryErrorBlacklist.includes(eventData.type)) {
                        return null;
                    }
                    const originalException = hint.originalException;
                    // ignore EROFS, ENOSPC and such errors always
                    const errorText = originalException?.code
                        ? originalException.code.toString()
                        : originalException?.message?.toString() || originalException;
                    if (typeof errorText === 'string' &&
                        (errorText.includes('EROFS') || // Read only FS
                            errorText.includes('ENOSPC') || // No disk space available
                            errorText.includes('ENOMEM') || // No memory (RAM) available
                            errorText.includes('EIO') || // I/O error
                            errorText.includes('ENXIO') || // I/O error
                            errorText.includes('EMFILE') || // too many open files
                            errorText.includes('ENFILE') || // file table overflow
                            errorText.includes('EBADF')) // Bad file descriptor
                    ) {
                        return null;
                    }
                    if (eventData.stacktrace?.frames &&
                        Array.isArray(eventData.stacktrace.frames) &&
                        eventData.stacktrace.frames.length) {
                        // if the last exception frame is from a Node.js internal method, we ignore this error
                        const fileName = eventData.stacktrace.frames[eventData.stacktrace.frames.length - 1].filename;
                        if (fileName && (fileName.startsWith('internal/') || fileName.startsWith('Module.'))) {
                            return null;
                        }
                        // Check if any entry is whitelisted from pathWhitelist
                        const whitelisted = eventData.stacktrace.frames.find(frame => {
                            if (frame.function?.startsWith('Module.')) {
                                return false;
                            }
                            if (frame.filename?.startsWith('internal/')) {
                                return false;
                            }
                            if (frame.filename &&
                                !sentryPathWhitelist.find(path => path?.length && frame.filename.includes(path))) {
                                return false;
                            }
                            if (frame.filename &&
                                sentryPathBlacklist.find(path => path?.length && frame.filename.includes(path))) {
                                return false;
                            }
                            return true;
                        });
                        if (!whitelisted) {
                            return null;
                        }
                        return true;
                    });
                    if (!whitelisted) {
                        return null;
                    }
                }
                return event;
            });
        }
    }
    /**
     * Return the Sentry object. This can be used to send own Messages or such
     *
     * @returns Sentry object
     */
    getSentryObject() {
        return this.Sentry;
    }
}
exports.default = SentryPlugin;
