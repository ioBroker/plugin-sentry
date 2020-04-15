# plugin-sentry
Sentry Plugin for ioBroker js-controller and Adapters

This is a simple plugin for ioBroker. It gets initialized when js-controller or Adapter that uses it gets started and registers with Sentry as error reporting tool.

## What is Sentry/Sentry.io?

Sentry.io is a way for developers to get an overview about errors from their applications. The ioBroker js-controller uses this method to make sure application crashes are reported to the ioBroker Core developers. Adapters can integrate Sentry error reporting also when relevant. With this the adapter developer can make sure to provide fixes for problems very fast and crashes do not stay unseen.

Especially with the automatic restart behaviour of ioBroker and adapters some crashes happen and no one really see them. And so we also do not get bug reports for them. With this method the information are provided to us completely automatically. 

When the js-controller crashes or an other Code error happens (and only then!), this error, that also appears in the ioBroker log, is submitted to our own Sentry server hosted in Germany. If you have allowed iobroker GmbH to collect diagnostic data then also your anonymous installation ID (this is just a unique ID **without** any additional infos about you, email, name or such) is included. This allows Sentry to group errors and show how many unique users are affected by such an error. IP addresses are not stored with the crash report! All data are deleted latest after 90 days.

All of this helps us developers to provide an error free smart home system that basically never crashes. :-)

If you want to disable the error reporting you can do this by setting the state "system.host.NAME.plugins.sentry.enabled" (for js-controller hosts) or "system.adapter.NAME.INSTANCE.plugins.sentry.enabled" (for adapter instances) to false. You should see a log message stating that sentry was disabled. After disabling the plugin no crashes from your system are reported and so can not be fixed without reporting them by yourself manually!

## Plugin Configuration
The configuration is like:

```
"plugins": {
    "sentry": {
        "dsn": "https://...@.../...",
        "pathWhitelist": ["@iobroker", "iobroker.js-controller"],
        "errorBlacklist": ["SyntaxError"]
    }
}
```

The configuration contains the following settings:
* **dsn**: Required. This is the Sentry DSN as displayed after creation of the sentry project
* **pathWhitelist**: Optional array with strings that needs to be part of the path to be included for reporting. Exceptions that do not contain one of these strings in the reported filenames will not be sent! The current name of the adapter the plugin is used in is automatically added.
* **errorBlacklist**: Optional array with error types that will not be reported. "SyntaxError" is added automatically because these should be found on development time and not with real customers. 

The configuration can be contained in io-package.json in common area or for js-controller in iobroker.data/iobroker.json on main level.

### How can I get my Sentry account as a developer?
One option is to use the free sentry service from [Sentry.io](https://sentry.io/). Here you can sign up and get an account up to 5.000 events per month for free. Here you have full control, but the Service ist hosted in the USA!

A second option is to contact @Apollon77 to discuss to get an account on the ioBroker own Sentry Server instance, but this might be limited by the available server resources, so we will not promise this!

The basic process to use the ioBroker Sentry system will be:
* You contact @Apollon77 by creating an issue here in this project for each adapter you want access and provice the link to the adapter repository
* We will do a enhanced Adapter review especially looking for error handling (because we do not want adapters flooding the sentry system)
* We will need an email to invite you to the Sentry instance and you need s Two-Factor-Auth App (e.g. Google Authenticator) to secure that account
* We will create the project on sentry and assign it to you
* We will provide the needed Sentry dsn for your configuration
* You add the configuration to io-package.json and a short info section to your README
* If you want to transfer own errors or other events we also talk about that in detail then
* Then you can test and release it. 

## Plugin States

This plugin respects the "enabled" state created as system.adapter.name.X.plugins.sentry.enabled and will **not** initialize the error reporting if set to false.

Additional states are not created.

## Usage

### Catch uncatched exceptions and unhandled promises
You just need to add the above configuration to io-package.json common section and you are done. As soon as js-controller 3.0 is used the plugin gets also used

### Send own Errors to Sentry
In cases where you want to report own errors or error you alreayd catched in your code also to Sentry you can use code like this in your adapter implementation ("error" in example is the Error object with the error)

```
try {
    ...
    throw new Error('...');
} catch(error) {
    if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
        const sentryInstance = adapter.getPluginInstance('sentry');
        if (sentryInstance) {
            sentryInstance.getSentryObject().captureException(error);
        }
    }
}
```

### Send own additional Events to Sentry
In case that you want to send other events you can also use other Sentry APIs offered by the JavaScript Sentry SDK (https://docs.sentry.io/platforms/javascript/).

```
if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
    const sentryInstance = adapter.getPluginInstance('sentry');
    if (sentryInstance) {
        const Sentry = sentryInstance.getSentryObject();
        Sentry && Sentry.withScope(scope => {
            scope.setLevel('info');
            scope.setExtra('key', 'value');
            Sentry.captureMessage('Event name', 'info'); // Level "info"
        });
    }
}
```

## Changelog

### 0.1.2 (2020-03-31)
* (Apollon77) fix filtering logic

### 0.1.1 (2020-03-29)
* (AlCalzone) add type support and optimizations

### 0.1.0 (2020-03-29)
* (Apollon77) initial release