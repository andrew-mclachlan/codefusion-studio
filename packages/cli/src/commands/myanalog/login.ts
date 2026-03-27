/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {Command, Flags} from '@oclif/core';

import {getSessionManager} from '../../utils/session-manager.js';

export default class CfsMyAnalogLogin extends Command {
  static aliases = ['auth:login'];
  static deprecateAliases = true;
  static description =
    'This will attempt to open your default web browser to log in to your myAnalog account.  It will also display a URL you can open manually if the browser does not open automatically.  The URL must be opened within 5 minutes and on the same machine this command is ran on.';

  static flags = {
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show additional details about the login session.'
    })
  };

  static hiddenAliases = ['myAnalog:login'];
  static summary = 'Log in with a myAnalog account.';

  async run(): Promise<void> {
    const {flags} = await this.parse(CfsMyAnalogLogin);
    let session;
    let sessionManager;
    try {
      sessionManager = getSessionManager();
      session = await sessionManager.getSession();
    } catch (error) {
      this.error(
        new Error(
          'An error occurred while checking authentication status.  If the issue persists, please reinstall this utility.',
          {
            cause: error
          }
        )
      );
    }

    if (session) {
      this.log(
        `You are already logged in to myAnalog as ${session.userEmail}.`
      );
      this.log(
        'To log in with a different account, please log out first.'
      );
      this.exit();
    }

    try {
      session = await sessionManager.createSession();
    } catch (error) {
      this.error(
        new Error(
          'An error occurred while trying to log in to myAnalog.',
          {
            cause: error
          }
        )
      );
    }

    this.log(
      `You are logged in to myAnalog as ${session.userEmail}.`
    );
    if (flags.verbose) {
      this.log(`Session details:
	User ID: ${session.userId}
	Scopes: ${session.scopes.join(', ')}`);
    }
  }
}
