

export const years = (i) => {
    i = parseInt(i, 10)
    return (1973 + i) + '-' + (1974 + i)
}


export const validateAmount = (amount) => /^\d+$/.test(amount)


export const parseAmount = (amount) => {
    const [whole, decimal = "00"] = amount.split(".");
    return `${whole}${decimal.slice(0, 2)}`;
};

export const formatAmount = (amount) => {
    return (amount / 100).toString() + '.' + (amount % 100).toString().padEnd(2, '0')
};