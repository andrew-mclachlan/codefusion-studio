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
import Toggle from '@common/components/toggle/Toggle';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';

import styles from './multiple-projects-toggle.module.scss';

type MultipleProjectsToggleProps = Readonly<{
	coreId: string;
	isEnabled: boolean;
	onCheckboxChange: (newValue: boolean) => void;
}>;

function MultipleProjectsToggle({
	coreId,
	isEnabled,
	onCheckboxChange
}: MultipleProjectsToggleProps): JSX.Element {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<div
			className={styles.container}
			data-test={`toggle:trustzone-container-${coreId}`}
		>
			<Toggle
				isToggledOn={isEnabled}
				dataTest={`toggle:trustzone-${coreId}`}
				handleToggle={() => {
					onCheckboxChange(!isEnabled);
				}}
			/>
			<div className={styles.label}>
				{l10n?.['cores-config']?.trustZone?.title}
			</div>
		</div>
	);
}

export default memo(MultipleProjectsToggle);
