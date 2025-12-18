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

import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {CheckBox} from 'cfs-react-library';

import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {useAppDispatch} from '../../../../state/store';
import {
	setConfigErrors,
	toggleCoreEnabled
} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {configErrors} from '../../../../common/constants/validation-errors';
import type {StateProject} from '../../../../common/types/state';

import styles from './inner-project-card.module.scss';

function InnerProjectCard({
	project: {id: projectId, isEnabled, Secure: isSecure}
}: Readonly<{
	project: StateProject;
}>) {
	const dispatch = useAppDispatch();
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const securityType = isSecure ? 'secure' : 'non-secure';
	const title =
		l10n?.['cores-config']?.trustZone?.[securityType]?.title ??
		`${securityType}`;
	const desc =
		l10n?.['cores-config']?.trustZone?.[securityType]?.description;

	const handleClick = (id: string) => {
		dispatch(toggleCoreEnabled(id));
		dispatch(
			setConfigErrors({
				id: configErrors.cores,
				notifications: []
			})
		);
	};

	return (
		<CfsSelectionCard
			id={projectId}
			isChecked={isEnabled}
			testId={`core-${projectId}`}
			onChange={() => {
				handleClick(projectId);
			}}
		>
			<div slot='start'>
				<CheckBox checked={isEnabled} />
			</div>
			<div className={styles.title} slot='title'>
				<h4>{title}</h4>
				<span>{desc}</span>
			</div>
		</CfsSelectionCard>
	);
}

export default InnerProjectCard;
