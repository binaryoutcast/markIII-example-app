/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { EzE10SUtils } = ChromeUtils.import("resource:///modules/EzE10SUtils.jsm");

ChromeUtils.defineESModuleGetters(this, {
  BrowserToolboxLauncher: "resource://devtools/client/framework/browser-toolbox/Launcher.sys.mjs",
});

Object.defineProperty(this, "BrowserConsoleManager", {
  get() {
    let { loader } = ChromeUtils.importESModule("resource://devtools/shared/loader/Loader.sys.mjs");
    return loader.require("devtools/client/webconsole/browser-console-manager").BrowserConsoleManager;
  },
  configurable: true,
  enumerable: true,
});

var MainExampleFunctions = {
  startup: function() {
    var browser = document.getElementById("main-browser");
    var homepage = Services.prefs.getCharPref("example.browser.defaultHomepage", "https://thereisonlyxul.org/");
    EzE10SUtils.loadAboutBlank(browser);
    EzE10SUtils.loadURI(browser, homepage);
  },
  quitApp: function() { Services.startup.quit(Services.startup.eAttemptQuit); },
  NavigateSomewhereElse: function() {
    var browser = document.getElementById("main-browser"); 
    EzE10SUtils.loadURI(browser, "https://mozilla.org/");
  }
}

