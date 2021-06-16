import { useEffect } from 'react';

export const ORIGINAL_PATH = location.pathname;

(function(history){
	const pushState = history.pushState;
	history.pushState = function(state) {
		if (typeof history.onpushstate == "function") {
			history.onpushstate({state: state});
		}
		return pushState.apply(history, arguments);
	};
})(window.history);

export const useHistory = (callback, hash = false) => {
	if (hash) {
		window.history.push = (path) => {
			window.history.pushState({}, '', window.location.origin + ORIGINAL_PATH + '#' + path);
		};
	} else {
		window.history.push = (path) => {
			window.history.pushState({}, '', window.location.origin + path);
		};
	}
	useEffect(() => {
		window.onpopstate = history.onpushstate = () => {
			setTimeout(callback, 10);
		};
		return () => window.onpopstate = history.onpushstate = null;
	}, [callback]);
};

export const pathAndArgs = () => {
	let path = window.location.href;
	let args;
	if (path.indexOf('#/') > -1) {
		args = url2args(path);
		path = path.split('#/')[1].split('?')[0];
	} else {
		args = url2args(path);
		path = window.location.pathname;
	}
	if (ORIGINAL_PATH.length > 1) {
		path = path.replace(ORIGINAL_PATH, '');
	}
	path = ('/' + path.split('/').filter(s => !!s.length).join('/'));
	return {
		path,
		pathArgs: path.split('/').map((p) => p.split('?')[0]).filter((p) => !!p.length),
		args,
	};
};

const url2args = (url) => Array.from(new URL(url).searchParams.entries())
	.map(([k, v]) => ({ [k]: v }))
	.reduce((a, c) => ({ ...a, ...c }), {});
