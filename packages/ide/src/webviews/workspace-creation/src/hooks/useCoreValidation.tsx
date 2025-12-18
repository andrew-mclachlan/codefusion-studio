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

import {useCallback} from 'react';
import type {StateProject} from '../common/types/state';
import {useConfigurationErrors} from '../state/slices/workspace-config/workspace-config.selector';

export default function useCoreValidation() {
	const coresErrors = useConfigurationErrors('cores');

	const isCoreCardErrorState = useCallback(
		(coreState: StateProject): boolean => {
			if (!coreState) return false;

			return Boolean(coresErrors.notifications.length);
		},
		[coresErrors.notifications]
	);

	return {
		isCoreCardErrorState
	};
}
