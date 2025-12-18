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

import useIsPinAssignmentRequired from '../../../hooks/useIsPinAssignmentRequired';
import styles from './signal-assignment-error.module.scss';
import {useAssignedPin} from '../../../state/slices/pins/pins.selector';
import {getSocPinDetails} from '../../../utils/soc-pins';

type SignalAssignmentErrorProps = Readonly<{
	signal: string;
	peripheral: string;
	isPinConflict?: number | boolean;
	isPinAssignmentMissing?: number | boolean;
}>;

function SignalAssignmentError({
	signal,
	peripheral,
	isPinConflict,
	isPinAssignmentMissing
}: SignalAssignmentErrorProps) {
	const isRequired = useIsPinAssignmentRequired(signal, peripheral);
	const assignedPin = useAssignedPin({signal, peripheral});
	const {Label} = getSocPinDetails(assignedPin?.pinId ?? signal);

	return (
		<div>
			<p
				className={styles.errorMessage}
				data-test='signal-assignment:error'
			>
				{isRequired && isPinAssignmentMissing
					? `${peripheral} ${signal} needs to be enabled`
					: null}
				{isPinConflict ? `Pin conflict for ${Label}` : null}
			</p>
		</div>
	);
}

export default SignalAssignmentError;
