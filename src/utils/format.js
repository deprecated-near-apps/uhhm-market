export const years = (i) => {
	i = parseInt(i);
	return (1972 + i) + '-' + (1973 + i);
};

export const validateAmount = (amount) => !!amount.length && amount !== '.' && /^\d*.\d?\d?$/.test(amount);

export const parseAmount = (amount) => {
	const [whole, decimal = "00"] = amount.split(".");
	return `${whole}${decimal.slice(0, 2).padEnd(2, '0')}`;
};

export const formatAmount = (amount) => {
	let r = (amount % 100);
	r = r < 10 ? r.toString().padStart(2, '0') : r.toString().padEnd(2, '0');
	return Math.floor(amount / 100).toString() + '.' + r;
};