/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {MultiSelect, type MultiSelectOption} from 'cfs-react-library';
import styles from './AssignedCores.module.scss';
import {type PartitionCore} from '../../../state/slices/partitions/partitions.reducer';
import {CorePermissions} from '../core-permissions/core-permissions';
import {getSocCoreList} from '../../../utils/soc-cores';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	getProjectInfoList,
	type ProjectInfo
} from '../../../utils/config';
import {useMemo} from 'react';
import {
	useActivePartitionProjects,
	useActivePartitionType
} from '../../../state/slices/partitions/partitions.selector';
import ProjectOption from '../../../components/project-option/project-option';

type AssignedCoresSectionProps = Readonly<{
	errors: {
		displayName: string;
		type: string;
		cores: string;
		startAddress: string;
		size: string;
	};
	onCoreChange: (cores: PartitionCore[]) => void;
}>;

// Get the cores that can access this memory type
function getOptionsFromProjects(
	projects: ProjectInfo[] | undefined,
	memoryType: string
) {
	if (!projects || projects?.length === 0) {
		return [];
	}

	const socCores = getSocCoreList();

	return projects
		?.filter(project => {
			const socCore = socCores.find(
				core => core.Id === project.CoreId
			);

			return socCore?.Memory.some(
				memory => 'Type' in memory && memory.Type === memoryType
			);
		})
		.map(project => ({
			label: <ProjectOption project={project} />,
			value: project.ProjectId,
			coreId: project.CoreId
		}));
}

function formatDropdownText(assignedCores: PartitionCore[]) {
	if (assignedCores.length === 0) {
		return 'Select projects';
	}

	if (assignedCores.length === 1) {
		return assignedCores[0].label;
	}

	return `${assignedCores.length} Projects Selected`;
}

export function AssignedCoresSection({
	errors,
	onCoreChange
}: AssignedCoresSectionProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.['user-partition'];
	const projects = getProjectInfoList();
	const activePartitionProjects = useActivePartitionProjects();
	const memoryType = useActivePartitionType() ?? '';

	const assignedCores = useMemo(() => {
		if (activePartitionProjects === undefined) {
			return [];
		}

		return activePartitionProjects;
	}, [activePartitionProjects]);

	const sortedCores = useMemo(
		() =>
			[...assignedCores].sort((a, b) =>
				a.projectId.localeCompare(b.projectId)
			),
		[assignedCores]
	);

	const chipText = useMemo(() => {
		if (assignedCores.length !== 1) {
			return '';
		}

		if (assignedCores.length === 1) {
			const projectInfo = projects?.find(project =>
				assignedCores?.find(
					core => core.projectId === project.ProjectId
				)
			);

			return `${projectInfo?.Secure ? 'S' : projectInfo?.Secure === false ? 'NS' : ''}`;
		}
	}, [assignedCores, projects]);

	const formattedDropdownText = useMemo(
		() => formatDropdownText(assignedCores),
		[assignedCores]
	);

	const optionsFromProjects = useMemo(
		() => getOptionsFromProjects(projects, memoryType),
		[projects, memoryType]
	);

	const initialSelectedOptions = useMemo(
		() =>
			getOptionsFromProjects(
				projects?.filter(core =>
					assignedCores.some(c => c.projectId === core.ProjectId)
				),
				memoryType
			),
		[projects, memoryType, assignedCores]
	);

	return (
		<div className={styles.section}>
			<h3>{i10n?.['assigned-cores']?.label}</h3>
			<MultiSelect
				error={errors?.cores}
				disabled={!optionsFromProjects?.length}
				dropdownText={formattedDropdownText}
				options={optionsFromProjects}
				dataTest='assigned-cores-multiselect'
				chipText={chipText}
				initialSelectedOptions={initialSelectedOptions}
				onSelection={(selectedCores: MultiSelectOption[]) => {
					onCoreChange(
						selectedCores.map(core => {
							const existingCore = assignedCores.find(
								c => c.projectId === core.value
							);
							const projectInfo = projects?.find(
								project => project.ProjectId === core.value
							);

							if (existingCore) {
								return existingCore;
							}

							const label = projectInfo?.Description;

							return {
								projectId: core.value,
								label: label ?? '',
								coreId: projectInfo?.CoreId ?? '',
								access: 'R',
								owner: assignedCores.length === 0
							} satisfies PartitionCore;
						})
					);
				}}
			/>
			{sortedCores.map(core => (
				<CorePermissions
					key={core.projectId}
					core={core}
					memoryType={memoryType}
					onRemoveCore={coreId => {
						onCoreChange(
							assignedCores.filter(c => c.projectId !== coreId)
						);
					}}
					onUpdateAccess={(id, value) => {
						onCoreChange(
							assignedCores.map(core =>
								core.projectId === id
									? {...core, access: value}
									: core
							)
						);
					}}
					onUpdateOwner={(id, value) => {
						onCoreChange(
							assignedCores.map(core =>
								core.projectId === id
									? {...core, owner: value}
									: {...core, owner: false}
							)
						);
					}}
				/>
			))}
		</div>
	);
}
