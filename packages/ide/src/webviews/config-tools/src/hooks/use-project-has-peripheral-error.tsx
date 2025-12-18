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

import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';
import {CONTROL_SCOPES} from '../constants/scopes';
import {getControlsFromCache} from '../utils/api';
import {useProjectsPeripheralAssignmentsErrors} from './use-projects-peripheral-assignments-errors-count';

/**
 * Custom hook to check if there are peripheral config or missing pin assignment errors for a specific project
 * @param projectId - project to check for errors
 * @returns boolean
 */
export default function useProjectHasPeripheralError(
	projectId: string
) {
	const allocations = usePeripheralAllocations();
	const controls = getControlsFromCache(
		CONTROL_SCOPES.PERIPHERAL,
		projectId
	);
	const peripheralErrorMap = useProjectsPeripheralAssignmentsErrors(
		{[projectId]: allocations[projectId] ?? {}},
		{[projectId]: controls ?? {}}
	);

	return peripheralErrorMap[projectId] > 0;
}
