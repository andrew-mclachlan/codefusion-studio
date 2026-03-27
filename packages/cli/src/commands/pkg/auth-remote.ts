/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {Args, Command, Flags, ux} from '@oclif/core';
import {MyAnalogCloudsmithCredentialProvider} from 'cfs-lib';

import {
  getCredentialProvider,
  getPackageManager
} from '../../utils/package-manager.js';

export default class CfsPackageAuthRemote extends Command {
  static args = {
    remoteName: Args.string({
      description: 'Name of the remote package server.',
      multiple: false,
      required: true
    })
  };

  static description = `To view the currently configured authentication methods, use '<%= config.bin %> pkg list-remotes'.

	To use myAnalog authentication, you must have an active session. See '<%= config.bin %> myanalog' to manage your myAnalog session.`;

  static examples = [
    {
      description: 'Specify a username and password',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --user USERNAME --password PASSWORD`
    },
    {
      description: 'Specify a username and be prompted for password',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --user USERNAME`
    },
    {
      description:
        'Obtain credentials automatically using your myAnalog session',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --myanalog`
    },
    {
      description: 'Do not use any authentication',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --none`
    }
  ];

  static flags = {
    none: Flags.boolean({
      char: 'n',
      aliases: ['no-auth'],
      description: 'Do not use any authentication.',
      required: false,
      exactlyOne: ['none', 'user', 'myanalog']
    }),
    myanalog: Flags.boolean({
      char: 'm',
      aliases: [
        'myAnalog',
        'my-analog',
        'with-myanalog',
        'with-myAnalog'
      ],
      description:
        'Authenticate automatically using myAnalog session.',
      required: false,
      exactlyOne: ['none', 'user', 'myanalog']
    }),
    user: Flags.string({
      char: 'u',
      description:
        'Authenticate with a username and password. If no password is provided, you will be prompted for one.',
      helpValue: 'USERNAME',
      multiple: false,
      required: false,
      exactlyOne: ['none', 'user', 'myanalog']
    }),
    password: Flags.string({
      char: 'p',
      description:
        'User password, API key or token to authenticate with.',
      helpValue: 'PASSWORD',
      multiple: false,
      required: false,
      dependsOn: ['user']
    })
  };

  static summary =
    'Set the method used to authenticate to a remote package server.';

  static usage = `<%= command.id %> REMOTENAME {--user USERNAME [--password PASSWORD] | --myanalog | --none}`;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CfsPackageAuthRemote);
    const {remoteName} = args;

    const packman = await getPackageManager({
      includeCredentialProvider: false
    });
    if (flags.none) {
      // Remove any authentication
      await packman.logout(remoteName);
    } else if (flags.myanalog) {
      // Use myAnalog session
      const myAnalogProvider = await getCredentialProvider();

      await packman.setRemoteCredentialProvider(
        remoteName,
        myAnalogProvider?.name ??
          MyAnalogCloudsmithCredentialProvider.name
      );

      if (myAnalogProvider) {
        // Attempts to fetch the user's token for the remote
        await packman.registerCredentialProvider(myAnalogProvider);
      } else {
        this.warn(
          `No active myAnalog session.\nRun '${this.config.bin} myanalog login' to create a session.`
        );
      }
    } else {
      // Use a username and password
      const username = flags.user ?? (await ux.ux.prompt('Username'));
      const password =
        flags.password ??
        (await ux.ux.prompt('Password (hidden)', {type: 'hide'}));
      await packman.login(remoteName, username, password);
    }

    this.log(`Authentication method set successfully!`);
  }
}
