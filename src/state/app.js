import { State } from '../utils/state';

import { initNear } from './near';
import { loadItems, loadCredits } from './views';
import { isMobile } from '../utils/mobile';

const initialState = {
	app: {
		loading: true,
		mounted: false,
		isMenuOpen: false,
		isMobile,
		isConnectOpen: false,
		dialog: null,
	},
	near: {
		initialized: false,
	},
	views: {
		marketStoragePaid: '0',
		tokens: [],
		sales: [],
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
	await dispatch(loadCredits(account));
	await dispatch(loadItems());
	update('app.loading', false);
};

export const snackAttack = (msg) => async ({ update, dispatch }) => {
	console.log('Snacking on:', msg);
	update('app.snack', msg);
	if (snackTimeout) clearTimeout(snackTimeout);
	snackTimeout = setTimeout(() => update('app.snack', null), 3000);
};