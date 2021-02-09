# plugin-sentry
Sentry Plugin for ioBroker js-controller and Adapters

This is a simple plugin for ioBroker. It gets initialized when js-controller or Adapter that uses it gets started and registers with Sentry as error reporting tool.

## What is Sentry/Sentry.io?

Sentry.io is a way for developers to get an overview about errors from their applications. The ioBroker js-controller uses this method to make sure application crashes are reported to the ioBroker Core developers. Adapters can integrate Sentry error reporting also when relevant. With this the adapter developer can make sure to provide fixes for problems very fast and crashes do not stay unseen.

Especially with the automatic restart behaviour of ioBroker and adapters some crashes happen and no one really see them. And so we also do not get bug reports for them. With this method the information are provided to us completely automatically. 

When the js-controller crashes or an other Code error happens (and only then!), this error, that also appears in the ioBroker log, is submitted to our own Sentry server hosted in Germany. If you have allowed iobroker GmbH to collect diagnostic data then also your anonymous installation ID (this is just a unique ID **without** any additional infos about you, email, name or such) is included. This allows Sentry to group errors and show how many unique users are affected by such an error. IP addresses are not stored with the crash report! All data are deleted latest after 90 days.

All of this helps us developers to provide an error free smart home system that basically never crashes. :-)

If you want to disable the error reporting you can do this by one of the followings ways:
* use ioBroker CLI commands like `iobroker plugin disable sentry` (for the current host) or `iobroker plugin disable sentry --instance adaptername.nr` (for an adapter/instance)
* set the state "system.host.NAME.plugins.sentry.enabled" (for js-controller hosts) or "system.adapter.NAME.INSTANCE.plugins.sentry.enabled" (for adapter instances) to false. You should see a log message stating that sentry was disabled. After disabling the plugin no crashes from your system are reported and so can not be fixed without reporting them by yourself manually!

## Plugin Configuration
The minimal configuration which needs to be added to the common section of io-package.json is like:

```
"plugins": {
    "sentry": {
        "dsn": "https://...@.../..."
    }
}
```

If needed there are two more optional configuration options that can be also be provided:

```
"plugins": {
    "sentry": {
        "dsn": "https://...@.../...",
        "pathWhitelist": ["@iobroker", "iobroker.js-controller"],
        "pathBlacklist": ["scripts.js"],
        "errorBlacklist": ["SyntaxError"]
    }
}
```


The configuration contains the following settings:
* **dsn**: Required. This is the Sentry DSN as displayed after creation of the sentry project
* **pathWhitelist**: Optional array with strings that needs to be part of the path to be included for reporting. Exceptions that do not contain one of these strings in the reported filenames will not be sent! The current name of the adapter the plugin is used in is automatically added.
* **pathBlacklist**: Optional array with strings that are checked against all exception lines and as soon as one line contains this string the exception is not send.
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
Readme add to top please:
```
**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.
```
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

## How to test Sentry integration
The easiest way is to add an invalid call to your code, e.g.

```
huhu();
```

or 

```
setTimeout(huhu, 10000);
```

The adapter should crash in this place and the exception should be shown in the sentry UI some seconds/minutes later

## Changelog

### 1.1.10 (2021-02-09)
* (Apollon77) Add ENXIO as ignored error

### 1.1.9 (2021-01-24)
* (Apollon77) upgrade plugin-base to catch some errors better

### 1.1.8 (2021-01-21)
* (Apollon77) upgrade deps to allow tracking on session level later

### 1.1.7 (2021-01-15)
* (Apollon77) Handle case gracefully when package.json is not available and so sentry plugin version can not be determined

### 1.1.6 (2020-12-28)
* (Apollon77) add sentry-plugin version tag to the sentry events

### 1.1.5 (2020-12-28)
* (Apollon77) fix the filtering of unwanted error
* (Apollon77) update dependencies

### 1.1.4 (2020-06-08)
* (Apollon77) also filter out EMFILE errors

### 1.1.3 (2020-05-24)
* (Apollon77) also filter out EIO and EBADF errors

### 1.1.2 (2020-05-12)
* (Apollon77) also filter out ENOMEM errors

### 1.1.1 (2020-05-10)
* (Apollon77) add more logging on temporary disable reasons

### 1.1.0 (2020-05-09)
* (Apollon77) add nodejs version and platform and js-controller version to Sentry data
* (Apollon77) check additional states if Sentry reporting is active or not

### 1.0.2 (2020-05-01)
* (Apollon77) update plugin-base

### 1.0.0 (2020-04-26)
* (Apollon77) add pathBlacklist config option
* (Apollon77) declare as 1.0.0 for js-controller 3.0 release

### 0.1.2 (2020-03-31)
* (Apollon77) fix filtering logic

### 0.1.1 (2020-03-29)
* (AlCalzone) add type support and optimizations

### 0.1.0 (2020-03-29)
* (Apollon77) initial release