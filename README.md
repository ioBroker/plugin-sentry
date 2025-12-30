# Plugin Sentry
Facilitates the integration of the Sentry error tracking and monitoring service into the js-controller and adapters, allowing developers to monitor and track any errors occurring within ioBroker setups.

## Purpose
By configuring `Sentry.io`, developers can receive real-time notifications and detailed reports of errors or exceptions in ioBroker systems, helping to identify and resolve issues promptly and ensuring the stability and reliability of home automation setups.

The integration with our Sentry server enables users to gather valuable information about the errors, including the stack trace, affected devices, and other relevant data.
This information helps analyze and debug the problems effectively, leading to improved performance and stability of the ioBroker system.

Providing consent to iobroker GmbH to collect diagnostic data, results in the inclusion of an anonymous installation ID **without** any additional information about you, such as email or name, is included.
This enables Sentry to group errors and gain insight into the number of unique users affected by a particular error. It's important to note that no IP addresses are present within crash reports, with all data deleted within 90 days at the latest.

All of these helps developers to provide an error-free smart home system that never crashes. :-)

## Disabling error reporting
If you wish to deactivate the error reporting feature, you have a couple of options:

1. Use the ioBroker CLI commands:  
    - To disable Sentry for the current host, use:  
`iobroker plugin disable sentry`.
    - To disable Sentry for a specific adapter/instance, use:  
    `iobroker plugin disable sentry --instance adaptername.nr`
1. Adjust the corresponding state values:

    - For js-controller hosts, set the state `system.host.NAME.plugins.sentry.enabled` to false.
    - Set the state `system.adapter.NAME.INSTANCE.plugins.sentry.enabled` to false for adapter instances.
  
Upon making these changes, you should see a log message confirming the disabling of Sentry.  

**Note: Once the plugin is disabled, the automatic reporting of system crashes will cease. If you still want to report any issues, you must do so manually.**

## Plugin configuration
The minimal configuration required for inclusion in the common section of io-package.json is as follows:

```json
{
    "common": {
        "plugins": {
            "sentry": {
                "dsn": "https://...@.../..."
            }
        }
    }
}
```

Two additional optional configuration options that can be also provided if required:

```json
{
    "common": {
        "plugins": {
            "sentry": {
                "dsn": "https://...@.../...",
                "pathWhitelist": [
                    "@iobroker",
                    "iobroker.js-controller"
                ],
                "pathBlacklist": [
                    "scripts.js"
                ],
                "errorBlacklist": [
                    "SyntaxError"
                ]
            }
        }
    }
}
```

The configuration includes the following settings:

- `dsn` (Required): This is the Sentry DSN, obtained after creating the Sentry project.

- `pathWhitelist` (Optional): An array of strings that specify the required path components for reporting. Only sends exceptions with filenames containing at least one of these strings.

- `pathBlacklist` (Optional): An array of strings used to check against each exception's lines. The exception will not send if any line contains one of these strings.

- `errorBlacklist` (Optional): An array of error types that will not be reported. Automatically adds the "SyntaxError" type since these errors are typically caught during development and not in production with real customers.

Define configurations in either the "common" area of the io-package.json file or in iobroker.data/iobroker.json at the main level, specifically for the js-controller.

## How can I get my Sentry account as a developer?
To obtain a Sentry account as a developer, you have a couple of options:

1. `Sentry.io`: You can sign up for a free account on [Sentry.io](https://sentry.io/), which offers up to 5,000 monthly events at no cost. With this option, you have complete control over your account, but it's important to note that the service is hosted in the USA.

2. **Contact @Apollon77**: Another option is to reach out to @Apollon77 to discuss the possibility of getting an account on the ioBroker own Sentry Server instance. However, please be aware that this option may be subject to limitations based on available server resources, so it cannot be guaranteed.

The basic process to use the ioBroker Sentry system is as follows:

1. Contact @Apollon77 by creating an issue in this project for each adapter you require access to. Make sure to include the link to the adapter repository.
1. We will conduct an enhanced adapter review, specifically focusing on error handling to ensure that adapters do not flood the Sentry system.
1. We will need your email address to invite you to the Sentry instance, and you will need a Two-Factor-Authentication app (e.g., Google Authenticator) to secure your account.
1. We will create the project on Sentry and assign it to you.
1. We will provide you with the necessary Sentry DSN for your configuration.
1. You must add the configuration to the io-package.json file and include a short information section in your README. Please add the following notice to the top of your README:  
`**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and instructions on disabling error reporting, please refer to the [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Use of Sentry reporting starts with js-controller 3.0.`
1. We can discuss the details separately if you wish to transfer your own errors or other events.
1. With everything finally set up, you can test and release your adapter.

Please follow these steps for smooth integration with the ioBroker Sentry system.

## Plugin states

This plugin respects the "enabled" state created by system.adapter.name.X.plugins.sentry.enabled and will **not** initialize the error reporting if set to false.

It will not create additional states.

## Usage

To catch uncaught exceptions and unhandled promises, add the configuration above to the common section of your io-package.json file. Once you have done that, you're all set. Automatic use of the plugin will occur when js-controller 3.0 is in use.

### Send specific errors to Sentry
If you want to send current errors or errors you have already caught in your code to Sentry, you can use the following code in your adapter implementation. In the example, "error" refers to the Error object containing the error.

```javascript
try {
    // ...
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

### Send additional events to Sentry
You can also use other Sentry APIs offered by the [JavaScript Sentry SDK](https://docs.sentry.io/platforms/javascript/) to send additional events.

```javascript
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

## Test Sentry integration
The easiest way is to add an invalid call to your code, e.g.,

`huhu();`

or 

`setTimeout(huhu, 10000);`

This should cause the adapter to crash and the exception to be shown in the sentry UI some seconds/minutes later

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

## Changelog
### 3.0.2 (2025-12-30)
- (@GermanBluefox) Updated packages to latest versions

### 3.0.0 (2025-10-13)
- (@GermanBluefox) Updated packages to latest versions

### 2.0.4 (2024-06-01)
- (foxriver76) work with plugin base v2
- (foxriver76) ported to TypeScript to provide improved type support

**Breaking Changes**: Due to the port to Plugin Base v2, `init` now returns a promise instead of accepting a callback parameter, also the export has changed to a named export

### 1.2.1 (2023-06-15)
- (bluefox) Update packages

### 1.2.0 (2022-02-19)
- (Apollon77) Add db types to sentry data

### 1.1.10 (2021-02-09)
- (Apollon77) Add ENXIO as ignored error

### 1.1.9 (2021-01-24)
- (Apollon77) upgrade plugin-base to catch some errors better

### 1.1.8 (2021-01-21)
- (Apollon77) upgrade deps to allow tracking on session level later

### 1.1.7 (2021-01-15)
- (Apollon77) Handle case gracefully when package.json is not available and so sentry plugin version can not be determined

### 1.1.6 (2020-12-28)
- (Apollon77) add sentry-plugin version tag to the sentry events

### 1.1.5 (2020-12-28)
- (Apollon77) fix the filtering of unwanted error
- (Apollon77) update dependencies

### 1.1.4 (2020-06-08)
- (Apollon77) also filter out EMFILE errors

### 1.1.3 (2020-05-24)
- (Apollon77) also filter out EIO and EBADF errors

### 1.1.2 (2020-05-12)
- (Apollon77) also filter out ENOMEM errors

### 1.1.1 (2020-05-10)
- (Apollon77) add more logging on temporary disable reasons

### 1.1.0 (2020-05-09)
- (Apollon77) add Node.js version and platform and js-controller version to Sentry data
- (Apollon77) check additional states if Sentry reporting is active or not

### 1.0.2 (2020-05-01)
- (Apollon77) update plugin-base

### 1.0.0 (2020-04-26)
- (Apollon77) add pathBlacklist config option
- (Apollon77) declare as 1.0.0 for js-controller 3.0 release

### 0.1.2 (2020-03-31)
- (Apollon77) fix filtering logic

### 0.1.1 (2020-03-29)
- (AlCalzone) add type support and optimizations

### 0.1.0 (2020-03-29)
- (Apollon77) initial release
