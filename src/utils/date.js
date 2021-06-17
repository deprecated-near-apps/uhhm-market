const bounds = [
	{ div: 604800000, sing: 'week', plur: 'weeks' },
	{ div: 86400000, sing: 'day', plur: 'days' },
	{ div: 3600000, sing: 'hour', plur: 'hours' },
	{ div: 60000, sing: 'minute', plur: 'minutes' },
	{ div: 1000, sing: 'second', plur: 'seconds' },
];

export const howLongAgo = ({
	ts,
	detail = 'hour',
	join = ', ',
	left = false,
	onlyNumbers = false,
}) => {
	let t = left ? (ts - Date.now()) : (Date.now() - ts);
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