#! /bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

MOZ_APP_VENDOR=BinOC
MOZ_APP_VERSION=`cat ${_topsrcdir}/comm/example/config/version.txt`
MOZ_APP_VERSION_DISPLAY=${MOZ_APP_VERSION}

MOZ_DEVTOOLS=all

# MOZ_APP_DISPLAYNAME will be set by branding/configure.sh
# MOZ_BRANDING_DIRECTORY is the default branding directory used when none is
# specified.
MOZ_BRANDING_DIRECTORY=comm/example/branding/unofficial
#MOZ_OFFICIAL_BRANDING_DIRECTORY=xreapps/example/branding/official
MOZ_APP_ID={c819f695-b35f-49d1-8b97-957ad5f8ea47}

# Most stuff is done via moz.configure now