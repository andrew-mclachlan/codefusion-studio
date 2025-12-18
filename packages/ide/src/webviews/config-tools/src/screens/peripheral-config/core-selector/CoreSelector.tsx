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
import {memo} from 'react';
import styles from './CoreSelector.module.scss';
import {type ProjectInfo} from '../../../utils/config';
import {Button, ChevronLeftIcon} from 'cfs-react-library';
import CoreSelectorCard from './core-selector-card';
import {type PeripheralSecurity} from '../../../types/peripherals';

export type CoreSelectorProps = Readonly<{
	title?: string;
	projectConfig?: ProjectInfo[];
	signalName?: string;
	projects: ProjectInfo[];
	peripheralSecurity?: PeripheralSecurity;
	onSelect: (coreId: string) => void;
	onCancel: () => void;
}>;

function CoreSelector({
	title,
	projects,
	projectConfig,
	signalName,
	peripheralSecurity,
	onSelect,
	onCancel
}: CoreSelectorProps) {
	const allocatableName = `${title} ${signalName ?? ''}`;

	const shouldDisableSelection = (project: ProjectInfo) => {
		// This will show the project as disabled if it is not in the projectConfig i.e if the peripheral cannot allocated to the project
		if (
			!projects.some(item => item.ProjectId === project.ProjectId)
		) {
			return true;
		}

		/* Legend for project/peripheral security allocation:

			project.Secure ↓    | peripheralSecurity →
			-------------------------------------------------------------
			TRUE (secure)         | Secure → ENABLE
														| Non-Secure → DISABLE
														| Any / undefined → ENABLE

			FALSE (non-secure)    | Secure → DISABLE
														| Non-Secure → ENABLE
														| Any / undefined → ENABLE

			undefined (treated as secure)
														| Secure → ENABLE
														| Non-Secure → DISABLE
														| Any / undefined → ENABLE
			*/

		const isProjectSecure = project.Secure ?? true;

		if (
			(peripheralSecurity === 'Secure' && !isProjectSecure) ||
			(peripheralSecurity === 'Non-Secure' && isProjectSecure)
		) {
			return true;
		}

		return false;
	};

	return (
		<div className={styles.container}>
			<Button
				appearance='icon'
				dataTest='core-selector-cancel-btn'
				className={`${styles.cancelButton} core-selector:cancel-btn`}
				onClick={onCancel}
			>
				<div className={styles.cancelIcon}>
					<ChevronLeftIcon />
					<span>Back</span>
				</div>
			</Button>
			<div
				className={styles.allocateText}
				data-test={`allocate-${title}-title`}
			>{`Allocate ${allocatableName} to: `}</div>
			<div id='core-selector' className={styles.coreSection}>
				{projectConfig?.map(project => {
					const isDisabled = shouldDisableSelection(project);

					return (
						<CoreSelectorCard
							key={`core-selector-card-${project.ProjectId}`}
							project={project}
							allocatableName={allocatableName}
							isDisabled={isDisabled}
							onSelect={onSelect}
						/>
					);
				})}
			</div>
		</div>
	);
}

export default memo(CoreSelector);
