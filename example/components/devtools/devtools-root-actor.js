/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals loader, require, exports */

/**
 * Actors for Developer Tools.
 */

var { ActorRegistry } = require("devtools/server/actors/utils/actor-registry");

loader.lazyRequireGetter(
  this,
  "RootActor",
  "devtools/server/actors/root",
  true
);
loader.lazyRequireGetter(
  this,
  "sendShutdownEvent",
  "devtools/server/actors/webbrowser",
  true
);
loader.lazyRequireGetter(
  this,
  "WorkerDescriptorActorList",
  "devtools/server/actors/worker/worker-descriptor-actor-list",
  true
);
loader.lazyRequireGetter(
  this,
  "ServiceWorkerRegistrationActorList",
  "devtools/server/actors/worker/service-worker-registration-list",
  true
);
loader.lazyRequireGetter(
  this,
  "ProcessActorList",
  "devtools/server/actors/process",
  true
);

/**
 * Create the basic root actor for any XRE Application.
 *
 * @param aConnection       The debugger connection to create the actor for.
 * @returns The actor for the connection.
 */
exports.createRootActor = function (aConnection) {
  const parameters = {
    workerList: new WorkerDescriptorActorList(aConnection, {}),
    serviceWorkerRegistrationList: new ServiceWorkerRegistrationActorList(
      aConnection
    ),
    processList: new ProcessActorList(),
    globalActorFactories: ActorRegistry.globalActorFactories,
    onShutdown: sendShutdownEvent,
  };

  // Create the root actor and set the application type
  const rootActor = new RootActor(aConnection, parameters);
  rootActor.applicationType = "generic";

  return rootActor;
};

