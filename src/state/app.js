import { State } from '../utils/state';
import { get } from '../utils/storage';
import { FAV_KEY } from './favs';

import { initNear } from './near';
import { loadItems, loadCredits } from './views';
import { isMobile, checkIsMobile } from '../utils/mobile';
import { howLongAgo } from '../utils/date';

const endTime = 1627370001973;

const initialState = {
	app: {
		loading: true,
		mounted: false,
		isEditionOpen: false,
		isMenuOpen: false,
		isFavOn: false,
		isHotOn: false,
		isMobile,
		isConnectOpen: false,
		dialog: null,
		timeLeft: '',
	},
	near: {
		initialized: false,
	},
	views: {
		favs: [],
		marketStoragePaid: '0',
		tokens: [],
		sales: [],
		allBidsByType: {},
		salesByType: {},
		allTokens: [],
		credits: '0',
	}
};
let snackTimeout;

export const { appStore, AppProvider } = State(initialState, 'app');

export const setDialog = (dialog) => async ({ update }) => {
	return new Promise((resolve, reject) => {
		dialog.resolve = async(res) => {
			resolve(res);
			update('app', { dialog: null });
		};
		dialog.reject = async() => {
			// reject('closed by user')
			update('app', { dialog: null });
		};
		update('app', { dialog });
	});
};

export const onAppMount = () => async ({ update, dispatch }) => {
	update('app', { mounted: true });
	const { account } = await dispatch(initNear());
	update('app.timeLeft', howLongAgo({ ts: endTime, left: true }));
	update('views.favs', get(FAV_KEY, []));
	await dispatch(loadItems(account));
	await dispatch(loadCredits(account));
	update('app.loading', false);
	setInterval(() => {
		if (endTime - Date.now() > 3600000) return;
		update('app.timeLeft', howLongAgo({ ts: endTime, left: true }));
		// update('app.timeLeft', howLongAgo({ ts: endTime, left: true, detail: 'minutes' }))
	}, 5000);
	let resizeDebounce;
	window.onresize = () => {
		if (resizeDebounce) clearTimeout(resizeDebounce);
		resizeDebounce = setTimeout(() => {
			update('app.isMobile', window.innerWidth < 992 || checkIsMobile());
		}, 500);
	};
};

export const snackAttack = (msg) => async ({ update, dispatch }) => {
	console.log('Snacking on:', msg);
	update('app.snack', msg);
	if (snackTimeout) clearTimeout(snackTimeout);
	snackTimeout = setTimeout(() => update('app.snack', null), 3000);
};