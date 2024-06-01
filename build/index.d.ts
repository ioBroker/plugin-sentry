import { PluginBase } from '@iobroker/plugin-base';
export default class SentryPlugin extends PluginBase {
    /** The Sentry instance */
    Sentry: typeof import('@sentry/node');
    /** If plugin is enabled after all checks */
    reallyEnabled: boolean;
    /**
     * Register and initialize Sentry
     *
     * @param pluginConfig plugin configuration from config files
     */
    init(pluginConfig: Record<string, any>): Promise<void>;
    private _registerSentry;
    /**
     * Return the Sentry object. This can be used to send own Messages or such
     * @returns Sentry object
     */
    getSentryObject(): typeof this.Sentry;
}
/** Type for a Sentry Instance */
export type SentryInstance = InstanceType<typeof SentryPlugin>;
