/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AddonManager } from "resource://gre/modules/AddonManager.sys.mjs";

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Blocklist: "resource://gre/modules/Blocklist.sys.mjs",
  ConsoleAPI: "resource://gre/modules/Console.sys.mjs",
  InstallRDF: "resource://app/modules/RDFManifestConverter.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(lazy, {
  AddonInternal: "resource://gre/modules/addons/XPIDatabase.jsm",
});

Services.obs.addObserver(doc => {
  if (
    doc.location.protocol + doc.location.pathname === "about:addons" ||
    doc.location.protocol + doc.location.pathname ===
      "chrome://mozapps/content/extensions/aboutaddons.html"
  ) {
    const win = doc.defaultView;
    let handleEvent_orig =
      win.customElements.get("addon-card").prototype.handleEvent;
    win.customElements.get("addon-card").prototype.handleEvent = function (e) {
      if (
        e.type === "click" &&
        e.target.getAttribute("action") === "preferences" &&
        this.addon.optionsType == AddonManager.OPTIONS_TYPE_DIALOG
      ) {
        let windows = Services.wm.getEnumerator(null);
        while (windows.hasMoreElements()) {
          let win2 = windows.getNext();
          if (win2.closed) {
            continue;
          }
          if (win2.document.documentURI == this.addon.optionsURL) {
            win2.focus();
            return;
          }
        }
        let features = "chrome,titlebar,toolbar,centerscreen";
        let instantApply = Services.prefs.getBoolPref(
          "browser.preferences.instantApply"
        );
        features += instantApply ? ",dialog=no" : "";
        win.docShell.rootTreeItem.domWindow.openDialog(
          this.addon.optionsURL,
          this.addon.id,
          features
        );
      } else {
        handleEvent_orig.apply(this, arguments);
      }
    };
    let update_orig = win.customElements.get("addon-options").prototype.update;
    win.customElements.get("addon-options").prototype.update = function (
      card,
      addon
    ) {
      update_orig.apply(this, arguments);
      if (addon.optionsType == AddonManager.OPTIONS_TYPE_DIALOG) {
        this.querySelector('panel-item[action="preferences"]').hidden = false;
      }
    };
  }
}, "chrome-document-loaded");

XPCOMUtils.defineLazyGetter(lazy, "BOOTSTRAP_REASONS", () => {
  const { XPIProvider } = ChromeUtils.import(
    "resource://gre/modules/addons/XPIProvider.jsm"
  );
  return XPIProvider.BOOTSTRAP_REASONS;
});

import { Log } from "resource://gre/modules/Log.sys.mjs";

var logger = Log.repository.getLogger("addons.bootstrap");

/**
 * Valid IDs fit this pattern.
 */
var gIDTest =
  /^(\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}|[a-z0-9-\._]*\@[a-z0-9-\._]+)$/i;

// Properties that exist in the install manifest
const PROP_METADATA = [
  "id",
  "version",
  "type",
  "internalName",
  "updateURL",
  "optionsURL",
  "optionsType",
  "aboutURL",
  "iconURL",
];
const PROP_LOCALE_SINGLE = ["name", "description", "creator", "homepageURL"];
const PROP_LOCALE_MULTI = ["developers", "translators", "contributors"];

// Map new string type identifiers to old style nsIUpdateItem types.
// Retired values:
// 32 = multipackage xpi file
// 8 = locale
// 256 = apiextension
// 128 = experiment
// theme = 4
const TYPES = {
  extension: 2,
  dictionary: 64,
};

const COMPATIBLE_BY_DEFAULT_TYPES = {
  extension: true,
  dictionary: true,
};

const hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);

function isXPI(filename) {
  let ext = filename.slice(-4).toLowerCase();
  return ext === ".xpi" || ext === ".zip";
}

/**
 * Creates a jar: URI for a file inside a ZIP file.
 *
 * @param {nsIFile} aJarfile
 *        The ZIP file as an nsIFile
 * @param {string} aPath
 *        The path inside the ZIP file
 * @returns {nsIURI}
 *        An nsIURI for the file
 */
function buildJarURI(aJarfile, aPath) {
  let uri = Services.io.newFileURI(aJarfile);
  uri = "jar:" + uri.spec + "!/" + aPath;
  return Services.io.newURI(uri);
}

/**
 * Gets an nsIURI for a file within another file, either a directory or an XPI
 * file. If aFile is a directory then this will return a file: URI, if it is an
 * XPI file then it will return a jar: URI.
 *
 * @param {nsIFile} aFile
 *        The file containing the resources, must be either a directory or an
 *        XPI file
 * @param {string} aPath
 *        The path to find the resource at, "/" separated. If aPath is empty
 *        then the uri to the root of the contained files will be returned
 * @returns {nsIURI}
 *        An nsIURI pointing at the resource
 */
function getURIForResourceInFile(aFile, aPath) {
  if (!isXPI(aFile.leafName)) {
    let resource = aFile.clone();
    if (aPath) {
      aPath.split("/").forEach(part => resource.append(part));
    }

    return Services.io.newFileURI(resource);
  }

  return buildJarURI(aFile, aPath);
}

export var BootstrapLoader = {
  name: "bootstrap",
  manifestFile: "install.rdf",
  async loadManifest(pkg) {
    /**
     * Reads locale properties from either the main install manifest root or
     * an em:localized section in the install manifest.
     *
     * @param {object} aSource
     *        The resource to read the properties from.
     * @param {boolean} isDefault
     *        True if the locale is to be read from the main install manifest
     *        root
     * @param {string[]} aSeenLocales
     *        An array of locale names already seen for this install manifest.
     *        Any locale names seen as a part of this function will be added to
     *        this array
     * @returns {object}
     *        an object containing the locale properties
     */
    function readLocale(aSource, isDefault, aSeenLocales) {
      let locale = {};
      if (!isDefault) {
        locale.locales = [];
        for (let localeName of aSource.locales || []) {
          if (!localeName) {
            logger.warn("Ignoring empty locale in localized properties");
            continue;
          }
          if (aSeenLocales.includes(localeName)) {
            logger.warn("Ignoring duplicate locale in localized properties");
            continue;
          }
          aSeenLocales.push(localeName);
          locale.locales.push(localeName);
        }

        if (!locale.locales.length) {
          logger.warn("Ignoring localized properties with no listed locales");
          return null;
        }
      }

      for (let prop of [...PROP_LOCALE_SINGLE, ...PROP_LOCALE_MULTI]) {
        if (hasOwnProperty(aSource, prop)) {
          locale[prop] = aSource[prop];
        }
      }

      return locale;
    }

    let manifestData = await pkg.readString("install.rdf");
    let manifest = lazy.InstallRDF.loadFromString(manifestData).decode();

    let addon = new lazy.AddonInternal();
    for (let prop of PROP_METADATA) {
      if (hasOwnProperty(manifest, prop)) {
        addon[prop] = manifest[prop];
      }
    }

    if (!addon.type) {
      addon.type = "extension";
    } else {
      let type = addon.type;
      addon.type = null;
      for (let name in TYPES) {
        if (TYPES[name] == type) {
          addon.type = name;
          break;
        }
      }
    }

    if (!(addon.type in TYPES)) {
      throw new Error("Install manifest specifies unknown type: " + addon.type);
    }

    if (!addon.id) {
      throw new Error("No ID in install manifest");
    }
    if (!gIDTest.test(addon.id)) {
      throw new Error("Illegal add-on ID " + addon.id);
    }
    if (!addon.version) {
      throw new Error("No version in install manifest");
    }

    addon.strictCompatibility =
      !(addon.type in COMPATIBLE_BY_DEFAULT_TYPES) ||
      manifest.strictCompatibility == "true";

    // Only read these properties for extensions.
    if (addon.type == "extension") {
      if (manifest.bootstrap != "true") {
        throw new Error("Non-restartless extensions no longer supported");
      }

      if (
        addon.optionsType &&
        addon.optionsType != AddonManager.OPTIONS_TYPE_DIALOG &&
        addon.optionsType != AddonManager.OPTIONS_TYPE_INLINE_BROWSER &&
        addon.optionsType != AddonManager.OPTIONS_TYPE_TAB
      ) {
        throw new Error(
          "Install manifest specifies unknown optionsType: " + addon.optionsType
        );
      }
    } else {
      // Convert legacy dictionaries into a format the WebExtension
      // dictionary loader can process.
      if (addon.type === "dictionary") {
        addon.loader = null;
        let dictionaries = {};
        await pkg.iterFiles(({ path }) => {
          let match = /^dictionaries\/([^\/]+)\.dic$/.exec(path);
          if (match) {
            let lang = match[1].replace(/_/g, "-");
            dictionaries[lang] = match[0];
          }
        });
        addon.startupData = { dictionaries };
      }

      // Only extensions are allowed to provide an optionsURL, optionsType,
      // optionsBrowserStyle, or aboutURL. For all other types they are silently ignored
      addon.aboutURL = null;
      addon.optionsBrowserStyle = null;
      addon.optionsType = null;
      addon.optionsURL = null;
    }

    addon.defaultLocale = readLocale(manifest, true);

    let seenLocales = [];
    addon.locales = [];
    for (let localeData of manifest.localized || []) {
      let locale = readLocale(localeData, false, seenLocales);
      if (locale) {
        addon.locales.push(locale);
      }
    }

    let dependencies = new Set(manifest.dependencies);
    addon.dependencies = Object.freeze(Array.from(dependencies));

    let seenApplications = [];
    addon.targetApplications = [];
    for (let targetApp of manifest.targetApplications || []) {
      if (!targetApp.id || !targetApp.minVersion || !targetApp.maxVersion) {
        logger.warn(
          "Ignoring invalid targetApplication entry in install manifest"
        );
        continue;
      }
      if (seenApplications.includes(targetApp.id)) {
        logger.warn(
          "Ignoring duplicate targetApplication entry for " +
            targetApp.id +
            " in install manifest"
        );
        continue;
      }
      seenApplications.push(targetApp.id);
      addon.targetApplications.push(targetApp);
    }

    // Note that we don't need to check for duplicate targetPlatform entries since
    // the RDF service coalesces them for us.
    addon.targetPlatforms = [];
    for (let targetPlatform of manifest.targetPlatforms || []) {
      let platform = {
        os: null,
        abi: null,
      };

      let pos = targetPlatform.indexOf("_");
      if (pos != -1) {
        platform.os = targetPlatform.substring(0, pos);
        platform.abi = targetPlatform.substring(pos + 1);
      } else {
        platform.os = targetPlatform;
      }

      addon.targetPlatforms.push(platform);
    }

    addon.userDisabled = false;
    addon.softDisabled =
      addon.blocklistState == lazy.Blocklist.STATE_SOFTBLOCKED;
    addon.applyBackgroundUpdates = AddonManager.AUTOUPDATE_DEFAULT;

    addon.userPermissions = null;

    addon.icons = {};
    if (await pkg.hasResource("icon.png")) {
      addon.icons[32] = "icon.png";
      addon.icons[48] = "icon.png";
    }

    if (await pkg.hasResource("icon64.png")) {
      addon.icons[64] = "icon64.png";
    }

    return addon;
  },

  loadScope(addon) {
    let file = addon.file || addon._sourceBundle;
    let uri = getURIForResourceInFile(file, "bootstrap.js").spec;
    let principal = Services.scriptSecurityManager.getSystemPrincipal();

    let sandbox = new Cu.Sandbox(principal, {
      sandboxName: uri,
      addonId: addon.id,
      wantGlobalProperties: ["ChromeUtils"],
      metadata: { addonID: addon.id, URI: uri },
    });

    try {
      Object.assign(sandbox, lazy.BOOTSTRAP_REASONS);

      XPCOMUtils.defineLazyGetter(
        sandbox,
        "console",
        () => new lazy.ConsoleAPI({ consoleID: `addon/${addon.id}` })
      );

      Services.scriptloader.loadSubScript(uri, sandbox);
    } catch (e) {
      logger.warn(`Error loading bootstrap.js for ${addon.id}`, e);
    }

    function findMethod(name) {
      if (sandbox.name) {
        return sandbox.name;
      }

      try {
        let method = Cu.evalInSandbox(name, sandbox);
        return method;
      } catch (err) {}

      return () => {
        logger.warn(`Add-on ${addon.id} is missing bootstrap method ${name}`);
      };
    }

    let install = findMethod("install");
    let uninstall = findMethod("uninstall");
    let startup = findMethod("startup");
    let shutdown = findMethod("shutdown");

    return {
      install: (...args) => install(...args),

      uninstall(...args) {
        uninstall(...args);
        // Forget any cached files we might've had from this extension.
        Services.obs.notifyObservers(null, "startupcache-invalidate");
      },

      startup(...args) {
        if (addon.type == "extension") {
          logger.debug(`Registering manifest for ${file.path}\n`);
          Components.manager.addBootstrappedManifestLocation(file);
        }
        return startup(...args);
      },

      shutdown(data, reason) {
        try {
          return shutdown(data, reason);
        } catch (err) {
          throw err;
        } finally {
          if (reason != lazy.BOOTSTRAP_REASONS.APP_SHUTDOWN) {
            logger.debug(`Removing manifest for ${file.path}\n`);
            Components.manager.removeBootstrappedManifestLocation(file);
          }
        }
      },
    };
  },
};