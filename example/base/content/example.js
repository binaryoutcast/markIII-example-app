/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { ElectrolysisUtils } = ChromeUtils.import("resource:///modules/ElectrolysisUtils.jsm");

function ExampleStartup() {
  var browser = document.getElementById("main-browser");
  var url = Services.prefs.getCharPref("example.browser.defaultHomepage", "https://thereisonlyxul.org/")
  ElectrolysisUtils.loadAboutBlank(browser);
  ElectrolysisUtils.loadURI(browser, url);
}

