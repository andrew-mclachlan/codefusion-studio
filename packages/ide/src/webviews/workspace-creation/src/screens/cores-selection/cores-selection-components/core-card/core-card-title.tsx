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
import {Badge} from 'cfs-react-library';
import useIsPrimaryMultipleProjects from '../../../../hooks/use-is-primary-multiple-projects';
import {PRIMARY} from '../../../../../../common/constants/core-properties';

import styles from './CoreCard.module.scss';

function CoreCardTitle({
	title,
	isPrimary
}: Readonly<{title: string; isPrimary: boolean}>) {
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		isPrimary ?? false
	);

	return (
		<div className={styles.projectHeader}>
			<h3 className={styles.coreTitle}>{title}</h3>
			{shouldShowPrimaryBadge && (
				<Badge appearance='secondary'>{PRIMARY}</Badge>
			)}
		</div>
	);
}

export default memo(CoreCardTitle);
