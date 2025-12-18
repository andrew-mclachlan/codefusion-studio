import {
	useConfigurationErrors,
	useSelectedCores,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';
import {getCoreList} from '../../utils/core-list';
import {useEffect, useMemo} from 'react';
import type {CatalogCoreInfo} from '../../common/types/catalog';
import CoreCard from './cores-selection-components/core-card/CoreCard';
import NotificationError from '../../components/notification-error/NotificationError';

import styles from './CoresSelectionContainer.module.scss';
import {useAppDispatch} from '../../state/store';
import {setCoresInitialState} from '../../state/slices/workspace-config/workspace-config.reducer';

export default function CoresSelectionContainer() {
	const dispatch = useAppDispatch();
	const selectedSoc = useSelectedSoc();
	const selectedCoresDict = useSelectedCores();
	const errors = useConfigurationErrors('cores');

	const projectsList: CatalogCoreInfo[] = useMemo(
		() => Object.values(getCoreList(selectedSoc)),
		[selectedSoc]
	);

	useEffect(() => {
		if (Object.keys(selectedCoresDict).length) return;

		// Init all available projects on first load
		dispatch(setCoresInitialState(projectsList.map(prj => prj.id)));
	}, [dispatch, projectsList, selectedCoresDict]);

	return (
		<div className={styles.coresSelectionContainer}>
			<NotificationError
				error={errors}
				testId='cores-selection:notification-error'
			/>

			<section
				className={styles.coreListContainer}
				data-test='cores-selection:container'
			>
				{projectsList.map(core => (
					<CoreCard key={core.id} core={core} />
				))}
			</section>
		</div>
	);
}
