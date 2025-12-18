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

import {memo, useCallback} from 'react';
import {useAppDispatch} from '../../../../state/store';
import {useConfiguredCore} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {
	removeProjects,
	addProjects
} from '../../../../state/slices/workspace-config/workspace-config.reducer';

import SingleProjectCard from './single-project-card';
import MultipleProjectsCard from './multiple-projects-card';

import type {CatalogCoreInfo} from '../../../../common/types/catalog';

function CoreCard({core}: Readonly<{core: CatalogCoreInfo}>) {
	const dispatch = useAppDispatch();
	const {id, isPrimary, name} = core;
	const baseCoreState = useConfiguredCore(id);

	const handleTrustZoneCheckboxChange = useCallback(
		(isChecked: boolean) => {
			if (isChecked) {
				dispatch(
					addProjects({
						baseId: id
					})
				);
			} else {
				dispatch(removeProjects({baseId: id}));
			}
		},
		[dispatch, id]
	);

	if (baseCoreState)
		return (
			<SingleProjectCard
				id={id}
				coreState={baseCoreState}
				onCheckboxChange={(newValue: boolean) => {
					handleTrustZoneCheckboxChange(newValue);
				}}
			/>
		);

	return (
		<MultipleProjectsCard
			baseCore={{
				id,
				isPrimary: isPrimary ?? false,
				name
			}}
			onCheckboxChange={(newValue: boolean) => {
				handleTrustZoneCheckboxChange(newValue);
			}}
		/>
	);
}

export default memo(CoreCard);
