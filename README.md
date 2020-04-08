# plugin-sentry
Sentry Plugin for ioBroker js-controller and Adapters

This is a simple plugin for ioBroker. It gets initialized when js-controller or Adapter that uses it gets started and registers with Sentry as error reporting tool.

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
* **dsn**: This is the Sentry DSN as displayed after creation of the sentry project
* **pathWhitelist**: Array with strings that needs to be part of the path to be included for reporting. Exceptions that do not contain one of these strings in the reported filenames will not be sent! The current name of the adapter the plugin is used in is automatically added.
* **errorBlacklist**: Array with error types that will not be reported. "SyntaxError" is added automatically because these should be found on development time and not with real customers. 

The configuration can be contained in io-package.json in common area or for js-controller in iobroker.data/iobroker.json on main level.

### How can I get my Sentry account?
One option is to use the free sentry service from [Sentry.io](https://sentry.io/). Here you can sign up and get an account up to 5.000 events per month for free. Here you have full control, but the Service ist hosted in the USA!

A second option is to contact @Apollon77 to discuss to get an account on the ioBroker own Sentry Server instance, but this might be limited by the available server resources, so we will not promise this!

## Plugin States

This plugin respects the "enabled" state created as system.adapter.name.X.plugins.sentry.enabled and will **not** initialize the error reporting if set to false.

Additional states are not created.

## Changelog

### 0.1.2 (2020-03-31)
* (Apollon77) fix filtering logic

### 0.1.1 (2020-03-29)
* (AlCalzone) add type support and optimizations

### 0.1.0 (2020-03-29)
* (Apollon77) initial release