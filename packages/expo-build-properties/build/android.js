"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAndroidSettingsGradle = exports.withAndroidDayNightTheme = exports.withAndroidQueries = exports.withAndroidCleartextTraffic = exports.withAndroidPurgeProguardRulesOnce = exports.withAndroidProguardRules = exports.withAndroidBuildProperties = void 0;
exports.updateAndroidProguardRules = updateAndroidProguardRules;
exports.updateAndroidSettingsGradle = updateAndroidSettingsGradle;
const config_plugins_1 = require("expo/config-plugins");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const androidQueryUtils_1 = require("./androidQueryUtils");
const fileContentsUtils_1 = require("./fileContentsUtils");
const { createBuildGradlePropsConfigPlugin } = config_plugins_1.AndroidConfig.BuildProperties;
exports.withAndroidBuildProperties = createBuildGradlePropsConfigPlugin([
    {
        propName: 'newArchEnabled',
        propValueGetter: (config) => {
            if (config.android?.newArchEnabled !== undefined) {
                config_plugins_1.WarningAggregator.addWarningAndroid('withAndroidBuildProperties', 'android.newArchEnabled is deprecated, use app config `newArchEnabled` instead.', 'https://docs.expo.dev/versions/latest/config/app/#newarchenabled');
            }
            return config.android?.newArchEnabled?.toString();
        },
    },
    {
        propName: 'android.minSdkVersion',
        propValueGetter: (config) => config.android?.minSdkVersion?.toString(),
    },
    {
        propName: 'android.compileSdkVersion',
        propValueGetter: (config) => config.android?.compileSdkVersion?.toString(),
    },
    {
        propName: 'android.targetSdkVersion',
        propValueGetter: (config) => config.android?.targetSdkVersion?.toString(),
    },
    {
        propName: 'android.buildToolsVersion',
        propValueGetter: (config) => config.android?.buildToolsVersion,
    },
    {
        propName: 'android.kotlinVersion',
        propValueGetter: (config) => config.android?.kotlinVersion,
    },
    {
        propName: 'android.packagingOptions.pickFirsts',
        propValueGetter: (config) => config.android?.packagingOptions?.pickFirst?.join(','),
    },
    {
        propName: 'android.packagingOptions.excludes',
        propValueGetter: (config) => config.android?.packagingOptions?.exclude?.join(','),
    },
    {
        propName: 'android.packagingOptions.merges',
        propValueGetter: (config) => config.android?.packagingOptions?.merge?.join(','),
    },
    {
        propName: 'android.packagingOptions.doNotStrip',
        propValueGetter: (config) => config.android?.packagingOptions?.doNotStrip?.join(','),
    },
    {
        propName: 'android.enableProguardInReleaseBuilds',
        propValueGetter: (config) => config.android?.enableProguardInReleaseBuilds?.toString(),
    },
    {
        propName: 'android.enableShrinkResourcesInReleaseBuilds',
        propValueGetter: (config) => config.android?.enableShrinkResourcesInReleaseBuilds?.toString(),
    },
    {
        propName: 'android.enablePngCrunchInReleaseBuilds',
        propValueGetter: (config) => config.android?.enablePngCrunchInReleaseBuilds?.toString(),
    },
    {
        propName: 'EX_DEV_CLIENT_NETWORK_INSPECTOR',
        propValueGetter: (config) => (config.android?.networkInspector ?? true).toString(),
    },
    {
        propName: 'expo.useLegacyPackaging',
        propValueGetter: (config) => config.android?.useLegacyPackaging?.toString(),
    },
    {
        propName: 'android.extraMavenRepos',
        propValueGetter: (config) => {
            const extraMavenRepos = (config.android?.extraMavenRepos ?? []).map((item) => {
                if (typeof item === 'string') {
                    return { url: item };
                }
                return item;
            });
            return extraMavenRepos.length > 0 ? JSON.stringify(extraMavenRepos) : undefined;
        },
    },
    {
        propName: 'android.useDayNightTheme',
        propValueGetter: (config) => config.android?.useDayNightTheme?.toString(),
    },
    {
        propName: 'android.enableBundleCompression',
        propValueGetter: (config) => config.android?.enableBundleCompression?.toString(),
    },
    {
        propName: 'reactNativeArchitectures',
        propValueGetter: (config) => config.android?.buildArchs?.join(','),
    },
], 'withAndroidBuildProperties');
/**
 * Appends `props.android.extraProguardRules` content into `android/app/proguard-rules.pro`
 */
const withAndroidProguardRules = (config, props) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (config) => {
            const extraProguardRules = props.android?.extraProguardRules ?? null;
            const proguardRulesFile = path_1.default.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
            const contents = await fs_1.default.promises.readFile(proguardRulesFile, 'utf8');
            const newContents = updateAndroidProguardRules(contents, extraProguardRules, 'append');
            if (contents !== newContents) {
                await fs_1.default.promises.writeFile(proguardRulesFile, newContents);
            }
            return config;
        },
    ]);
};
exports.withAndroidProguardRules = withAndroidProguardRules;
/**
 * Purge generated proguard contents from previous prebuild.
 * This plugin only runs once in the prebuilding phase and should execute before any `withAndroidProguardRules` calls.
 */
const withAndroidPurgeProguardRulesOnce = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (config) => {
            const RUN_ONCE_NAME = 'expo-build-properties-android-purge-proguard-rules-once';
            /**
             * The `withRunOnce` plugin will delay this plugin's execution.
             * To make sure this plugin executes before any `withAndroidProguardRules`.
             * We use the `withRunOnce` internal History functions to do the check.
             * Example calls to demonstrate the case:
             * ```ts
             * config = withBuildProperties(config as ExpoConfig, {
             *   android: {
             *     kotlinVersion: "1.6.10",
             *   },
             * });
             * config = withBuildProperties(config as ExpoConfig, {
             *   android: {
             *     enableProguardInReleaseBuilds: true,
             *     extraProguardRules: "-keep class com.mycompany.** { *; }",
             *   },
             * });
             * ```
             */
            if (config_plugins_1.History.getHistoryItem(config, RUN_ONCE_NAME)) {
                return config;
            }
            else {
                config_plugins_1.History.addHistoryItem(config, { name: RUN_ONCE_NAME });
            }
            const proguardRulesFile = path_1.default.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
            const contents = await fs_1.default.promises.readFile(proguardRulesFile, 'utf8');
            const newContents = updateAndroidProguardRules(contents, '', 'overwrite');
            if (contents !== newContents) {
                await fs_1.default.promises.writeFile(proguardRulesFile, newContents);
            }
            return config;
        },
    ]);
};
exports.withAndroidPurgeProguardRulesOnce = withAndroidPurgeProguardRulesOnce;
/**
 * Update `newProguardRules` to original `proguard-rules.pro` contents if needed
 *
 * @param contents the original `proguard-rules.pro` contents
 * @param newProguardRules new proguard rules to add. If the value is null, the returned value will be original `contents`.
 * @returns return updated contents
 */
function updateAndroidProguardRules(contents, newProguardRules, updateMode) {
    if (newProguardRules == null) {
        return contents;
    }
    const options = { tag: 'expo-build-properties', commentPrefix: '#' };
    let newContents = contents;
    if (updateMode === 'overwrite') {
        newContents = (0, fileContentsUtils_1.purgeContents)(contents, options);
    }
    if (newProguardRules !== '') {
        newContents = (0, fileContentsUtils_1.appendContents)(newContents, newProguardRules, options);
    }
    return newContents;
}
const withAndroidCleartextTraffic = (config, props) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        if (props.android?.usesCleartextTraffic == null) {
            return config;
        }
        config.modResults = setUsesCleartextTraffic(config.modResults, props.android?.usesCleartextTraffic);
        return config;
    });
};
exports.withAndroidCleartextTraffic = withAndroidCleartextTraffic;
function setUsesCleartextTraffic(androidManifest, value) {
    const mainApplication = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
    if (mainApplication?.$) {
        mainApplication.$['android:usesCleartextTraffic'] = String(value);
    }
    return androidManifest;
}
const withAndroidQueries = (config, props) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        if (props.android?.manifestQueries == null) {
            return config;
        }
        const { manifestQueries } = props.android;
        // Default template adds a single intent to the `queries` tag
        const defaultIntents = config.modResults.manifest.queries.map((q) => q.intent ?? []).flat() ?? [];
        const defaultPackages = config.modResults.manifest.queries.map((q) => q.package ?? []).flat() ?? [];
        const defaultProviders = config.modResults.manifest.queries.map((q) => q.provider ?? []).flat() ?? [];
        const newQueries = {
            package: [...defaultPackages, ...(0, androidQueryUtils_1.renderQueryPackages)(manifestQueries.package)],
            intent: [...defaultIntents, ...(0, androidQueryUtils_1.renderQueryIntents)(manifestQueries.intent)],
            provider: [...defaultProviders, ...(0, androidQueryUtils_1.renderQueryProviders)(manifestQueries.provider)],
        };
        config.modResults.manifest.queries = [newQueries];
        return config;
    });
};
exports.withAndroidQueries = withAndroidQueries;
const withAndroidDayNightTheme = (config, props) => {
    return (0, config_plugins_1.withAndroidStyles)(config, (config) => {
        if (!props.android?.useDayNightTheme) {
            return config;
        }
        const { style = [] } = config.modResults.resources;
        if (!style.length) {
            return config;
        }
        // Replace `AppTheme` and remove `ResetEditText`
        const excludedStyles = ['AppTheme', 'ResetEditText'];
        // Remove the hardcoded colors.
        const excludedAttributes = ['android:textColor', 'android:editTextStyle'];
        config.modResults.resources.style = [
            {
                $: {
                    name: 'AppTheme',
                    parent: 'Theme.AppCompat.DayNight.NoActionBar',
                },
                item: [...style[0].item.filter(({ $ }) => !excludedAttributes.includes($.name))],
            },
            ...style.filter(({ $ }) => !excludedStyles.includes($.name)),
        ];
        return config;
    });
};
exports.withAndroidDayNightTheme = withAndroidDayNightTheme;
const withAndroidSettingsGradle = (config, props) => {
    return (0, config_plugins_1.withSettingsGradle)(config, (config) => {
        config.modResults.contents = updateAndroidSettingsGradle({
            contents: config.modResults.contents,
            buildFromSource: props.android?.buildFromSource,
        });
        return config;
    });
};
exports.withAndroidSettingsGradle = withAndroidSettingsGradle;
function updateAndroidSettingsGradle({ contents, buildFromSource, }) {
    let newContents = contents;
    if (buildFromSource === true) {
        const addCodeBlock = [
            '', // new line
            'includeBuild(expoAutolinking.reactNative) {',
            '  dependencySubstitution {',
            '    substitute(module("com.facebook.react:react-android")).using(project(":packages:react-native:ReactAndroid"))',
            '    substitute(module("com.facebook.react:react-native")).using(project(":packages:react-native:ReactAndroid"))',
            '    substitute(module("com.facebook.react:hermes-android")).using(project(":packages:react-native:ReactAndroid:hermes-engine"))',
            '    substitute(module("com.facebook.react:hermes-engine")).using(project(":packages:react-native:ReactAndroid:hermes-engine"))',
            '  }',
            '}',
            '', // new line
        ];
        newContents += addCodeBlock.join('\n');
    }
    return newContents;
}
