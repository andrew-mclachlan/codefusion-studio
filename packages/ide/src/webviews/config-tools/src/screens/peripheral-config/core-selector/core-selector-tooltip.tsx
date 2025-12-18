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
import CfsTooltip from '../../../../../common/components/cfs-tooltip/CfsTooltip';
import type {ProjectInfo} from '../../../utils/config';
import styles from './CoreSelector.module.scss';
import {NOTCH_POS} from '../../../../../common/constants/tooltip';

export type CoreSelectorTooltipProps = Readonly<{
	allocatableName: string;
	project: ProjectInfo;
}>;

const notchHeight = 6;
const offsetX = 25;
const offsetY = 16;

function CoreSelectorTooltipCard({
	allocatableName,
	project
}: CoreSelectorTooltipProps) {
	const {
		top: itemTop = 0,
		left: itemLeft = 0,
		height: itemHeight = 0
	} = document
		.getElementById(`core-selector-card-${project.ProjectId}`)
		?.getBoundingClientRect() ?? {};

	const {top: containerTop = 0} =
		document
			.getElementById('peripheral-navigation')
			?.getBoundingClientRect() ?? {};

	const top: number =
		itemTop - containerTop + itemHeight + notchHeight;

	return (
		<CfsTooltip
			isShowingNotch
			id={`core-selector-${project.ProjectId}-tooltip`}
			classNames={styles.coreSelectorTooltipContainer}
			notchPos={NOTCH_POS.RIGHT}
			top={top - offsetY}
			left={itemLeft - offsetX}
		>
			<div
				data-test={`core-${project.ProjectId}-tooltip`}
			>{`${allocatableName} cannot be allocated to ${project.Name}.`}</div>
		</CfsTooltip>
	);
}

export default memo(CoreSelectorTooltipCard);
