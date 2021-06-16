const bounds = [
	{ div: 604800, sing: 'week', plur: 'weeks' },
	{ div: 86400, sing: 'day', plur: 'days' },
	{ div: 3600, sing: 'hour', plur: 'hours' },
	{ div: 60, sing: 'minute', plur: 'minutes' },
];

export const howLongAgo = ({
	ts,
	detail = 'hour',
	join = ', ',
	left = false,
	onlyNumbers = false,
}) => {
	let t = left ? (ts - Date.now()) / 1000 : (Date.now() - ts) / 1000;
	const matches = [];
	for (let i = 0; i < bounds.length; i++) {
		const { div, sing, plur } = bounds[i];
		const v = Math.floor(t / div);
		if (t > div) {
			matches.push(v + ' ' + (onlyNumbers ? '' : (t > div * 2 ? plur : sing)));
			if (!detail) break;
			if (detail === sing) break;
			t -= div * v;
		}
	}
	return matches.join(join);
};