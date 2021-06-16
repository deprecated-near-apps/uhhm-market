const bounds = [
	{ div: 604800, sing: 'week', plur: 'weeks' },
	{ div: 86400, sing: 'day', plur: 'days' },
	{ div: 3600, sing: 'hour', plur: 'hours' },
	{ div: 60, sing: 'minute', plur: 'minutes' },
];

export const howLongAgo = (ts, detail = false, join = ', ') => {
	let t = (Date.now() - ts) / 1000;
	const matches = [];
	for (let i = 0; i < bounds.length; i++) {
		const { div, sing, plur } = bounds[i];
		const v = Math.floor(t / div);
		if (t > div) {
			matches.push(v + ' ' + (t > div * 2 ? plur : sing));
			if (!detail) break;
			if (detail === sing) break;
			t -= div * v;
		}
	}
	return matches.join(join);
};