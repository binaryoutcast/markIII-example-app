/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  NetUtil: "resource://gre/modules/NetUtil.sys.mjs",
});

function resolveURIInternal(aCmdLine, aArgument) {
  var uri = aCmdLine.resolveURI(aArgument);

  if (!(uri instanceof Ci.nsIFileURL)) {
    return uri;
  }

  try {
    if (uri.file.exists()) {
      return uri;
    }
  } catch (e) {
    console.error(e);
  }

  // We have interpreted the argument as a relative file URI, but the file
  // doesn't exist. Try URI fixup heuristics: see bug 290782.

  try {
    uri = Services.uriFixup.getFixupURIInfo(aArgument, 0).preferredURI;
  } catch (e) {
    console.error(e);
  }

  return uri;
}

export function DevToolsStartup() {}

DevToolsStartup.prototype = {
  QueryInterface: ChromeUtils.generateQI(["nsICommandLineHandler"]),

  helpInfo: "",
  handle(cmdLine) {
    this.initialize();

    // We want to overwrite the -devtools flag and open the toolbox instead
    const devtoolsFlag = cmdLine.handleFlag("devtools", false);
    if (devtoolsFlag) {
      this.handleDevToolsFlag(cmdLine);
    }

    var chromeFlag = cmdLine.handleFlagWithParam("chrome", false);
    if (chromeFlag) {
      // The parameter specifies the window to open.
      this.handleChromeFlag(cmdLine, chromeFlag);
    }
  },

  handleDevToolsFlag(cmdLine) {
    const { BrowserToolboxLauncher } = ChromeUtils.importESModule(
      "resource://devtools/client/framework/browser-toolbox/Launcher.sys.mjs"
    );
    BrowserToolboxLauncher.init();

    if (cmdLine.state == Ci.nsICommandLine.STATE_REMOTE_AUTO) {
      cmdLine.preventDefault = true;
    }
  },

  handleChromeFlag(cmdLine, chromeParam) {
    try {
      const argstring = Cc["@mozilla.org/supports-string;1"].createInstance(
        Ci.nsISupportsString
      );

      const _uri = resolveURIInternal(cmdLine, chromeParam);

      // only load URIs which do not inherit chrome privs
      if (!Services.io.URIChainHasFlags(_uri, Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT)) {
        Services.ww.openWindow(null, _uri.spec, "_blank", "chrome,dialog=no,all", argstring);
        cmdLine.preventDefault = true;
      }
    } catch (e) { dump(e); }
  },

  initialize() {
    const { loader, require, DevToolsLoader } = ChromeUtils.importESModule(
      "resource://devtools/shared/loader/Loader.sys.mjs"
    );
    const { DevToolsServer } = require("devtools/server/devtools-server");
    const { gDevTools } = require("devtools/client/framework/devtools");

    // Make sure our root actor is always registered, no matter how devtools are called.
    const devtoolsRegisterActors =
      DevToolsServer.registerActors.bind(DevToolsServer);
    DevToolsServer.registerActors = function (options) {
      devtoolsRegisterActors(options);
      if (options.root) {
        const {
          createRootActor,
        } = require("resource:///modules/devtools-root-actor.js");
        DevToolsServer.setRootActor(createRootActor);
      }
    };

    // Make the loader visible to the debugger by default and for the already
    // loaded instance. Thunderbird now also provides the Browser Toolbox for
    // chrome debugging, which uses its own separate loader instance.
    DevToolsLoader.prototype.invisibleToDebugger = false;
    loader.invisibleToDebugger = false;
    DevToolsServer.allowChromeProcess = true;

    // Initialize and load the toolkit/browser actors. This will also call above function to set the
    // Thunderbird root actor
    DevToolsServer.init();
    DevToolsServer.registerAllActors();
  },
};
