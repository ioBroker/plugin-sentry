import { PluginBase } from '@iobroker/plugin-base';
export default class SentryPlugin extends PluginBase {
    /** The Sentry instance */
    Sentry: typeof import('@sentry/node');
    /** If the plugin is enabled after all checks */
    reallyEnabled: boolean;
    /**
     * Register and initialize Sentry
     *
     * @param pluginConfig plugin configuration from config files
     */
    init(pluginConfig: Record<string, any>): Promise<void>;
    /**
     * Load the Sentry module.
     *
     * All ioBroker adapters share one flat `node_modules` directory. If npm ends up with an incomplete or conflicting
     * tree, `@sentry/node` or one of its OpenTelemetry dependencies cannot be resolved. `@sentry/node-core` declares
     * them as optional peer dependencies, so npm does not necessarily place them next to it. In this case only the
     * error reporting is switched off instead of reporting a cryptic module resolution error.
     *
     * @returns the Sentry module or null if it is not installed completely
     */
    private _loadSentry;
    private _registerSentry;
    /**
     * Return the Sentry object. This can be used to send own Messages or such
     *
     * @returns Sentry object
     */
    getSentryObject(): typeof this.Sentry;
}
