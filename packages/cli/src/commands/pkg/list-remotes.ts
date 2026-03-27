/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {Command, ux} from '@oclif/core';

import {
  getCredentialProvider,
  getPackageManager
} from '../../utils/package-manager.js';

export default class CfsPackageListRemotes extends Command {
  static description =
    'Lists all remote servers that have been registered for package retrieval.';

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: false
    });
    const remotes = await packman.listRemotes();
    if (remotes.length === 0) {
      this.log('No registered package remotes');
      return;
    }

    // Check if we have an active myAnalog session
    const myAnalogProvider = await getCredentialProvider();
    let needsSession = false;

    const data = remotes.map((r) => {
      let authDetails = 'None';
      if (r.auth) {
        if (r.auth.credentialProvider) {
          const hasSession =
            myAnalogProvider?.name === r.auth.credentialProvider;

          authDetails = `${r.auth.credentialProvider} session${hasSession ? '' : ' (inactive)'}`;
          needsSession = needsSession || !hasSession;
        } else {
          authDetails = `username: ${r.auth.username}`; // manually logged in
        }
      }

      return {
        name: r.name,
        url: r.url.href,
        auth: authDetails,
        default: r.custom ? 'No' : 'Yes'
      };
    });

    ux.Table.table(data, {
      name: {
        header: 'Name'
      },
      url: {
        header: 'URL'
      },
      auth: {
        header: 'Authentication'
      },
      default: {
        header: 'Default'
      }
    });
    this.log('');

    if (needsSession) {
      this.warn(
        `Package remotes that require an active myAnalog session are disabled.\nRun '${this.config.bin} myanalog login' to create a session.`
      );
    }
  }
}
