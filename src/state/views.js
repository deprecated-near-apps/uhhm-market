import { contractId, fungibleId, marketId } from '../utils/near-utils';
import { Account } from 'near-api-js';
import { get, set, del } from '../utils/storage';
// api-helper config
const domain = 'https://helper.nearapi.org';
const batchPath = domain + '/v1/batch/';
const headersObj = {
	'max-age': '21600' // 6hrs
}

if (process.env.REACT_APP_ENV === 'prod') {
	headersObj['near-network'] = 'mainnet'
}
const headers = new Headers(headersObj);
const DELIMETER = '||';

import { howLongAgo } from '../utils/date';

const GATEWAY_BASE = 'https://cloudflare-ipfs.com/ipfs/';
const DWEB_BASE = 'http://dweb.link/ipfs/';
const IPFS_BASE = 'https://ipfs.io/ipfs/';
const NEAR_BASE = 'https://near.mypinata.cloud/ipfs/';
const LOW_RES_GIF = '/low-res.gif';
const VIDEO = '/1.m4v';
const UHHM_TOKEN_KEYS = {
	v1: '__TOKENS_V1'
};
const uhhmTokenVersion = 'v1';

export const RESERVE_PRICE = 4700
export const ACCOUNT_SALES = '__ACCOUNT_SALES__'

const sortBids = (a, b) => parseInt(b.price) - parseInt(a.price);

export const loadCredits = (account) => async ({ update, getState }) => {
	if (!account) return;
	const { contractAccount } = getState();
	update('views', {
		credits: await contractAccount.viewFunction(fungibleId, 'ft_balance_of', {
			account_id: account.accountId
		})
	});
};

const parseSale = ({
	i, sales, tokens, account,
	allBidsByType,
	salesByType,
	debug = false
}) => {
	let sale = sales[i];
	const { token_id, token_type } = sale;

	let token = tokens.find(({ token_type: tt }) => tt === token_type);
	if (token) {
		sale = sales[i] = Object.assign({}, token, sales[i]);
	}
	sale.edition_id = parseInt(token_id.split(':')[1]);
	const bids = (sale.bids[fungibleId] || []).sort(sortBids);

	sale.minBid = Math.max(
		parseInt(Object.values(sale.sale_conditions)[0]), // reserve
		parseInt(bids[0]?.price || '0'));


	if (account) {
		const { accountId } = account
		const accountSales = get(ACCOUNT_SALES + account.accountId, [])
		if (bids.some(({ owner_id }) => owner_id === accountId)) {
			if (!accountSales.includes(token_id)) accountSales.push(token_id)
		}
		set(ACCOUNT_SALES + account.accountId, accountSales)
	}

	if (!allBidsByType[token_type]) allBidsByType[token_type] = [{ owner_id: 'reserve', price: Object.values(sale.sale_conditions)[0] }];
	allBidsByType[token_type].push(...(bids));

	if (salesByType) {
		if (!salesByType[token_type]) salesByType[token_type] = 0;
		salesByType[token_type]++;
	}

	return { sales, tokens, allBidsByType, salesByType };
};

export const loadSale = (token_id) => async ({ update, getState }) => {
	const { account, contractAccount, views: { sales, tokens, allBidsByType } } = getState();
	const sale = await contractAccount.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	const i = sales.findIndex(({ token_id }) => token_id === sale.token_id);
	if (i === -1) return
	sales.splice(i, 1, sale)
	parseSale({ i, sales, tokens, allBidsByType, account });
	update('views', { sales, allBidsByType });
};

export const loadSalesForEdition = (token_type) => async ({ update, getState }) => {
	console.log('loadSalesForEdition', token_type)

	const { account, contractAccount, views: { sales, tokens, allBidsByType, salesByType } } = getState();
	
	// find sale
	const editionSales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
		token_type,
		from_index: '0',
		limit: 36
	});
	if (!editionSales || !editionSales.length) return
	
	// does sale already exist and we just got an update? e.g. have they been here before?
	editionSales.forEach((sale) => {
		let i = sales.findIndex(({ token_id }) => token_id === sale.token_id);
		if (i === -1) {
			i = sales.length
			sales.push(sale)
		} else {
			sales.splice(i, 1, sale)
		}
		parseSale({ i, sales, allBidsByType, salesByType, tokens, account });
	})
	
	update('views', { sales, allBidsByType, salesByType });
};

export const loadNextEdition = (token_type) => async ({ update, getState }) => {
	console.log('loadNextEdition', token_type)

	const { account, contractAccount, views: { sales, tokens, allBidsByType } } = getState();
	
	// find next token_id for this type
	const token_id = token_type + ':' + (sales.filter(({ token_type: tt }) => tt === token_type)
		.map(({token_id}) => parseInt(token_id.split(':')[1]))
		.sort()[0] + 1)
	
	// find sale
	const sale = await contractAccount.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	if (!sale) return
	
	// does sale already exist and we just got an update? e.g. have they been here before?
	let i = sales.findIndex(({ token_id }) => token_id === sale.token_id);
	if (i === -1) {
		i = sales.length - 1
		sales.push(sale)
	} else {
		sales.splice(i, 1, sale)
	}
	
	parseSale({ i, sales, allBidsByType, tokens, account });
	update('views', { sales, allBidsByType });
};

export const loadItems = (account) => async ({ update, getState, dispatch }) => {

	const { contractAccount } = getState();

	/// uhhm tokens
	let tokens = get(UHHM_TOKEN_KEYS[uhhmTokenVersion], null);
	if (!tokens) {
		console.log('fetching tokens from remote');
		tokens = (await fetch(batchPath + '{}', {
			method: 'POST',
			headers,
			body: JSON.stringify([{
				contract: contractId,
				method: 'nft_tokens_batch',
				args: {
					token_ids: uhhmTokenIds
				},
				batch: {
					from_index: '0',
					limit: uhhmTokenIds.length,
					step: '50', // divides batch above
					flatten: [],
				},
			}])
		}).then((res) => res.json()))[0];

		tokens.forEach((token) => {
			token.displayType = token.token_type.split('HipHopHead')[1].slice(1);
			token.displayHowLongAgo = howLongAgo({
				ts: token.metadata.issued_at, detail: 'hour'
			});
			// token.imageSrc = `${DWEB_BASE}${token.metadata.media}${LOW_RES_GIF}`;
			// token.imageSrc = `${GATEWAY_BASE}${token.metadata.media}${LOW_RES_GIF}`;
			token.imageSrc = `https://uhhm-heads.s3.us-west-2.amazonaws.com/${token.metadata.media}.webp`;
			// token.imageSrc = `https://nft.hiphop/webp/${token.metadata.media}`;
			token.videoSrc = `${DWEB_BASE}${token.metadata.media}${VIDEO}`;
			token.videoSrc2 = `${IPFS_BASE}${token.metadata.media}${VIDEO}`;
			token.videoSrc3 = `${NEAR_BASE}${token.metadata.media}${VIDEO}`;
		});
		// migrate
		set(UHHM_TOKEN_KEYS[uhhmTokenVersion], tokens);
		Object.entries(UHHM_TOKEN_KEYS).forEach(([k, v]) => {
			if (k === uhhmTokenVersion) return;
			del(v);
		});
	} else {
		console.log('loading tokens from cache');
	}

	// fix img src
	tokens.forEach((token) => {
		token.imageSrc = `https://uhhm-heads.s3.us-west-2.amazonaws.com/${token.metadata.media}.webp`;
	});
	// migrate
	set(UHHM_TOKEN_KEYS[uhhmTokenVersion], tokens);
	Object.entries(UHHM_TOKEN_KEYS).forEach(([k, v]) => {
		if (k === uhhmTokenVersion) return;
		del(v);
	});


	console.log('uhhm tokens', tokens.length);
	update('views', { tokens });
	if (window.location.pathname === '/') {
		update('app', { loading: false });
	}

	/// all sales

	const salesNum = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_contract_id', { nft_contract_id: contractId });
	console.log('sales total', salesNum);
	const sales = (await fetch(batchPath + JSON.stringify([{
		contract: marketId,
		method: 'get_sales_by_nft_contract_id',
		args: {
			nft_contract_id: contractId,
		},
		batch: {
			from_index: '0',
			limit: salesNum,
			step: '75',
			flatten: [],
		},
		sort: {
			path: 'metadata.issued_at',
		}
	}]), { headers }).then((res) => res.json()))[0];
	console.log('sales', sales.length);

	/// formatting

	// merge sale listing with nft token data
	const allBidsByType = {}, salesByType = {};
	sales.forEach((_, i) => parseSale({ i, sales, tokens, allBidsByType, salesByType, account }));

	Object.values(allBidsByType).forEach((arr) => arr.sort(sortBids));

	await update('views', { tokens, sales, allBidsByType, salesByType });

	return { tokens, sales, allBidsByType, salesByType };
};

export const doesAccountExist = (accountId) => async ({ update, getState, dispatch }) => {
	const { near: { connection } } = getState()
	try {
		await new Account(connection, accountId).state();
		return true;
	} catch (e) {
		if (/does not exist while viewing/.test(e)) {
			return false
		}
		throw e;
	}
};

const data = [
	{ token_type: 'HipHopHead.10.143.11151512', metadata: { media: 'QmTzFSvzB5tmk1b1UAjMBgNHb9TT8e3vkoMXnYsFYNHBFM' } },
	{ token_type: 'HipHopHead.10.229.1011310', metadata: { media: 'QmdrmfykQaRtSvG1zeNugDbYSyT3917qMNHyavwin8Awu2' } },
	{ token_type: 'HipHopHead.10.229.1011310.V2', metadata: { media: 'QmUmpPiBV9W6CTtnZmZ1JyTsgmBTSb415qY2XJ6VEwVA8r' } },
	{ token_type: 'HipHopHead.10.229.182114', metadata: { media: 'QmRy74iuwgRLioU8PMuWdfzKAY7ziw88LkQ8UTPAMENiq6' } },
	{ token_type: 'HipHopHead.10.229.4133', metadata: { media: 'QmbVcj2CHXcuWaFBHs26NvCH2eamCGgyrGw2F4XQRLaV1i' } },
	{ token_type: 'HipHopHead.10.229.4133.V2', metadata: { media: 'QmRCTF1T3ixiKa66iNanN1gahWuFWNRDbQq4tVoJT8uBbf' } },
	{ token_type: 'HipHopHead.10.292.11151512', metadata: { media: 'QmTircpFUAc4vg8utvLvtKK5RifPMhPZJ4QyxW47hZnRtK' } },
	{ token_type: 'HipHopHead.10.292.1618914', metadata: { media: 'QmbuKPhabJ1YAZpTVMTSSMFXDh3VvFpuE8BktNkaQJTBGV' } },
	{ token_type: 'HipHopHead.10.292.22166', metadata: { media: 'QmPhKtRGJcPHZCUyDX7FSB3UHoSvaFANFgy5jPJV3U1GBA' } },
	{ token_type: 'HipHopHead.11.260.418418', metadata: { media: 'QmcQ2tjnaRq3qCHCMphjFrSZb8jYrQQVK9MCE1VjKGF2aV' } },
	{ token_type: 'HipHopHead.12.99', metadata: { media: 'QmeTe8pCNxGpqopmMbtJhc2jeyK6DbPx3Z7Ym4Zoj7nMzq' } },
	{ token_type: 'HipHopHead.13.183', metadata: { media: 'QmT8Fqyvyw1JU6TUonHxPDx5NuPZaRdBP1NPtueZyutCjA' } },
	{ token_type: 'HipHopHead.13.2', metadata: { media: 'QmUcp3pAyecADHEYy9MY6WqDEin4BcUedjAG4Ut4TEh9Hm' } },
	{ token_type: 'HipHopHead.13.204.11181915', metadata: { media: 'QmNR9ZtkkokZYm3WXRaEVc5VoT8QQtbknhSCgYZok9YzsE' } },
	{ token_type: 'HipHopHead.13.220.618519', metadata: { media: 'QmarSJWc4Zf5EaY5wUFNiNEFWXiDGLxmBX5Ec7MsFjFmKj' } },
	{ token_type: 'HipHopHead.13.330.181119', metadata: { media: 'QmSpUEb96bGU7BhuqyUqaKnr42PNtqYAUeprn6SAHTsfej' } },
	{ token_type: 'HipHopHead.13.330.181119v2', metadata: { media: 'QmUvX5ZX4bBCkX79MYzs6FAsaMcja6bEhkd1jN2mhtbKEM' } },
	{ token_type: 'HipHopHead.13.330.181119v3', metadata: { media: 'QmUUDcfrPSZcuArxiNZYGJxMtKV5mHmc5UDi5r4LRKprXK' } },
	{ token_type: 'HipHopHead.13.330.51893', metadata: { media: 'QmPgRKJ2SPmdcxtM5EhsAk5dTWY6rbWxAsD3VGzQRnWqjr' } },
	{ token_type: 'HipHopHead.13.351', metadata: { media: 'QmfLxFShoDS3WB7p3x7fvuZFeDNng53AncejAEw1Z6EMTj' } },
	{ token_type: 'HipHopHead.14.143', metadata: { media: 'Qmf296559NiV639y6r9Z7ucuAQ7hgQ5rzSuszrkGkCRgoZ' } },
	{ token_type: 'HipHopHead.14.196', metadata: { media: 'QmPx3gAeGVFsguKeHb3PZLR9CCxv8pDyVtV1LsbhaBPTaC' } },
	{ token_type: 'HipHopHead.14.331.1611818', metadata: { media: 'QmUp8pXav9fpCyo1X8zpixBuN4tndLK19mWwTHBPZF45Wx' } },
	{ token_type: 'HipHopHead.14.331.51893', metadata: { media: 'QmNyxcitFMCHSECBkkTkm6KeHdsNNAX1PaKwvq5rBrYgo1' } },
	{ token_type: 'HipHopHead.14.363.133185', metadata: { media: 'QmTQPcvDrXWWKyB1zRxXFuBEu3xgEwX5gQpDGA2eXqGJie' } },
	{ token_type: 'HipHopHead.14.363.512625', metadata: { media: 'QmVYrjJdi2amQ9CLszxAyt22PaATZhs1vPUtfvmEXQFdnV' } },
	{ token_type: 'HipHopHead.14.363.9353', metadata: { media: 'QmVAjzQWtwA9c6qyDR9kxM6wwN9Li8VFX2mKEhQrpQ5o1A' } },
	{ token_type: 'HipHopHead.14.75', metadata: { media: 'QmNRLmApBHiTVzDezzUeCtcwqExVs7ZKsrfYgfSq6dYoX7' } },
	{ token_type: 'HipHopHead.15.213.193118', metadata: { media: 'QmUpczBYDrddAbqMRof4mCs1Jvia1u12tFhPwvBz3Y38Hr' } },
	{ token_type: 'HipHopHead.15.33', metadata: { media: 'QmSy38qJWnMopRxdmJXGRoyjnGLD41v3F2ufL9NpMgbgSa' } },
	{ token_type: 'HipHopHead.15.71.1194', metadata: { media: 'QmbwFDFqcFSp6AmnYMy5TX2uFb63PjM5CB12wGxAVXZJnE' } },
	{ token_type: 'HipHopHead.15.71.1612125', metadata: { media: 'QmNY6tnqL8YtnrVfVqsNdW6nrKCeYyZRZ38kLbQ5GwCeRe' } },
	{ token_type: 'HipHopHead.15.84', metadata: { media: 'QmYysjUbLvMhKkvTisVWdZf5SWwoNKFpqT8X2P98sss88d' } },
	{ token_type: 'HipHopHead.16.116.111257', metadata: { media: 'QmTSrLi4iAE1QvCM35HzCz5vjYmcmVFLU2itHCTzkvqHud' } },
	{ token_type: 'HipHopHead.16.116.201851', metadata: { media: 'Qme1167wLp89uuVKqyRBpGU6GzNS1qvg5FRKHPYiNtnk3F' } },
	{ token_type: 'HipHopHead.16.116.2291418', metadata: { media: 'QmTJzcMo4fbJc6q3TDXsgKXQTz2tibCPQboFL5Zo4xzZXx' } },
	{ token_type: 'HipHopHead.16.249.112919', metadata: { media: 'QmT2Le3G3Kh9oLLVv2r3najYFNKezc1He3z2zVgu5LB3hg' } },
	{ token_type: 'HipHopHead.16.249.16896', metadata: { media: 'QmYhTdrEr1bKzwFZJxyqcbubGoHrwN7Vp5b42wS6Ccyrr9' } },
	{ token_type: 'HipHopHead.16.249.16896.V2', metadata: { media: 'QmaueDyjxuCMVoEDdgvBYeyDRjHXugTBHZVHtT6juSmhAa' } },
	{ token_type: 'HipHopHead.16.249.1720916', metadata: { media: 'QmeAMwgGS6bc7Di8rGYnmTWmcoEXistgoztQQhGFDjSfop' } },
	{ token_type: 'HipHopHead.16.95.133195', metadata: { media: 'QmQMXS1JBBBHVAJvWhUpNZUwGQLJbcgMCdUYBH4ojwPd9o' } },
	{ token_type: 'HipHopHead.16.95.165205', metadata: { media: 'QmNntuMnyhtj4Sm8moRzDHQ3hSZhELw2qdED2JHn8ERr69' } },
	{ token_type: 'HipHopHead.17.157', metadata: { media: 'QmWXJgT2sjZxHrqoTJLjiM7bJU1GpB3czTGDuu8QH6wci7' } },
	{ token_type: 'HipHopHead.17.192.7261', metadata: { media: 'QmbjJWvPnAdwn1CpkDTsigUYnQSQjfCW1ki75DgT7QGeXT' } },
	{ token_type: 'HipHopHead.17.318.165205', metadata: { media: 'QmYiymCf9dTPY9HrPGUjoEbD2mccpsKdb2USB1EJjGSMfT' } },
	{ token_type: 'HipHopHead.17.318.3121913', metadata: { media: 'Qmf1A3b8qBRAKHkfCmZvmbZhj5B18hkFmH982dtYyxXPqv' } },
	{ token_type: 'HipHopHead.17.353.2211920', metadata: { media: 'QmU6aQ5tWhSNwYzLsi3Se8b8BTuWFDq7XtFbAMns38MJ7e' } },
	{ token_type: 'HipHopHead.18.240.1118126', metadata: { media: 'Qme2PQvqZiMmb7m4C4xZkrmZi4uj2a94NYrnh9i9qmjg6Z' } },
	{ token_type: 'HipHopHead.18.240.19111515', metadata: { media: 'QmeooCeCaA5RSSKcHJDVye6dtCkygnEEZTTqWLaMQiHdyU' } },
	{ token_type: 'HipHopHead.18.357.1311920', metadata: { media: 'QmQu3VJGdt4HxwysZR1Vhy5fG2q5EsRkw4MKUBszXf95Bq' } },
	{ token_type: 'HipHopHead.19.245.1618154', metadata: { media: 'QmfBTLE6udwQyDWQVS5QXBMzNVEyFJRFguFAJUFXz2P1fP' } },
	{ token_type: 'HipHopHead.19.245.812215', metadata: { media: 'QmXaQ5FLuGhx3kNPFMUjfL7BaN2Qh5tYNJiWTArBwTKDtc' } },
	{ token_type: 'HipHopHead.19.350', metadata: { media: 'QmYkaQVDWJ9Nq4kc1cyYKFTXJ26GRbH51itfGEdd6ge196' } },
	{ token_type: 'HipHopHead.19.42', metadata: { media: 'QmYXuabrDdTMPggEvoS25pdvgTfXBh9BkTXvHx48VgC3rv' } },
	{ token_type: 'HipHopHead.19.42.V2', metadata: { media: 'QmVCALVABvDmxMVGnaMHZTWJrrUXKTddviMqxfKcrb7jJc' } },
	{ token_type: 'HipHopHead.19.56', metadata: { media: 'QmTd33rnwhDS1Wnqh89rDiXHzf9DzR3gRWLYB5BCnR1C6c' } },
	{ token_type: 'HipHopHead.20.104', metadata: { media: 'QmNhKfZUN8b2aiStgRxc4SXjyTSFXzdqsRdBhjHsaZq3TC' } },
	{ token_type: 'HipHopHead.20.251', metadata: { media: 'QmcJdTMe85NquueXfiXc1fjkJEyDnj7ed9rvtxSipSrrJh' } },
	{ token_type: 'HipHopHead.20.90.135208', metadata: { media: 'QmZX1jSVo1DDrbQVLrMfLiwXb1XgCPXJ4iPTY7pENai1gs' } },
	{ token_type: 'HipHopHead.20.90.1542', metadata: { media: 'QmNjVZcdHywvmz4V1G4dy5N9sms5YFpneTthabRmyQ2SJ2' } },
	{ token_type: 'HipHopHead.20.90.181511', metadata: { media: 'Qmcsxrv82rok75mHtrk1M5ywJPcBVZhSgnkPygS2HFaFFH' } },
	{ token_type: 'HipHopHead.20.90.18261', metadata: { media: 'QmecNFYGyVepPEVuSSJmg5vpMQjFm4NAQ8aBnVRNXCQEbY' } },
	{ token_type: 'HipHopHead.20.90.781519', metadata: { media: 'Qmd5KQMM31cGQ2NwFpZcCLhdZhaewuFuEsW1PsLTksp3d2' } },
	{ token_type: 'HipHopHead.20.90.9141916', metadata: { media: 'QmbgJNcY5oXavoGAP69j6sGpJnsxqUaeFcVBh5hyGm5NpF' } },
	{ token_type: 'HipHopHead.21.229', metadata: { media: 'QmU33q3sSi4vDVj52UiaB7tVUdnXbM5uoYoR9Pjx16Yn3e' } },
	{ token_type: 'HipHopHead.21.33', metadata: { media: 'QmecgZ4sAroGxjc1z92h3qMew2eoKvRzDtBD5ZGYoB6Cjt' } },
	{ token_type: 'HipHopHead.21.352', metadata: { media: 'QmPqpHHUwxBvTcM4GMuABwwjnX67husUrDikEDYK5xJRsY' } },
	{ token_type: 'HipHopHead.22.319', metadata: { media: 'QmWzUbjJj3xLn5EgQqfDMdeqXcvZUkWKFMrc5rHt9fnkJf' } },
	{ token_type: 'HipHopHead.23.100', metadata: { media: 'QmXJ71EfY2VpC2U2MTdd1XXQWpjif46SDSD6VzrYcDo3A7' } },
	{ token_type: 'HipHopHead.23.324', metadata: { media: 'QmU3Gca11ppcFaCANqnbi4NHdw5Ec6cev7NUw9B5NML7xq' } },
	{ token_type: 'HipHopHead.23.324.V2', metadata: { media: 'QmaDq5KM2XQcvZrnj3o32zw2MZciPuxm8JNhy8pxuQMQ6J' } },
	{ token_type: 'HipHopHead.23.338', metadata: { media: 'QmWtRhq2aESmWPfvQgN1xLJaDsxSGwyosbyEHbUJMvsZaP' } },
	{ token_type: 'HipHopHead.23.340.1415185', metadata: { media: 'QmTgB1Khy19BvjRcbP4LsejQusRWaJny9n5WfUNsa1b5ER' } },
	{ token_type: 'HipHopHead.23.93', metadata: { media: 'QmQaKcGDjew5Wmet4KJR2KVkCq2LoZu46hUxnZppDox96B' } },
	{ token_type: 'HipHopHead.24.155.10141', metadata: { media: 'Qmb38LD37LmauScUCXwAx82jfTZR9kpXjUjDDPZU9Czqjg' } },
	{ token_type: 'HipHopHead.24.155.19202512', metadata: { media: 'QmNYiSNvXz4g8ZyPoCv4oCYVnswjEve1Ci8td9YfBDxjDa' } },
	{ token_type: 'HipHopHead.24.155.19855', metadata: { media: 'QmaTMsYyU8t9GcPxtYCTetSfFKJ74CKBmYcvaQbJ1rAPZ7' } },
	{ token_type: 'HipHopHead.24.260', metadata: { media: 'QmUhT9tqkQkNhu1EHHpXqMPrmSxWebTALfomwWCuLK5omQ' } },
	{ token_type: 'HipHopHead.24.274', metadata: { media: 'QmbLTjNxsFsgGvPW7obRGsATSwj8qzQspBxRP7tzYkTsAn' } },
	{ token_type: 'HipHopHead.24.344.141205', metadata: { media: 'QmUyPXMZpt7Tiqayexf2L3tGavysMVf8rgS7tLv3i4nc5V' } },
	{ token_type: 'HipHopHead.24.344.311318', metadata: { media: 'QmcsZgakgPmcNP9UtB8WFPYbz9WnbdKHUGMHwwJLob5N3t' } },
	{ token_type: 'HipHopHead.24.71.1291210', metadata: { media: 'QmR6mc9rgnYttZU6jCTijJM3YuP1GaEiHK7e3DCCsXsMQd' } },
	{ token_type: 'HipHopHead.24.78', metadata: { media: 'QmRgzujcEDLbCQBLEk3hf8pSguucZAVrnaTVkPuc9427YT' } },
	{ token_type: 'HipHopHead.25.252', metadata: { media: 'QmaffcaBHmnq9g7F4pfRwNVnxRZvefYqBS2tu2Bhhe2SZe' } },
	{ token_type: 'HipHopHead.25.294', metadata: { media: 'QmQbBS1sAj7nQxEp3xxuqDJhzVzNBVAJtbU9ptNVB9sGnx' } },
	{ token_type: 'HipHopHead.25.49.1315194', metadata: { media: 'QmVRbD3hoPzdWzvS64ddGFQpWnqhfwFBPGUWMvuvk9ok3c' } },
	{ token_type: 'HipHopHead.26.300', metadata: { media: 'QmZDFbRX8DUi1Qsaw4qAHN2ATgbUsQJkz1mrnFbf26q2PC' } },
	{ token_type: 'HipHopHead.26.34', metadata: { media: 'QmeRN8uEKBZxTsxuKdDXzzjz8qRVyjhx3JLbcKjdiVgGpc' } },
	{ token_type: 'HipHopHead.28.294', metadata: { media: 'Qmb7tDjbLi2w826Hba2gVUjZpLVeVxRTkS8WjWkPhvDiqJ' } },
	{ token_type: 'HipHopHead.28.294.12121525', metadata: { media: 'QmPsXiPiaBr64FzcLnpoZLCsH1d3XEYGbKNuLYFT1qiJYa' } },
	{ token_type: 'HipHopHead.28.294.20151425', metadata: { media: 'QmUd3k5ip2jJYaWRGbYg2e1JCU5Tp65a21BvHMzurnYuDM' } },
	{ token_type: 'HipHopHead.28.31', metadata: { media: 'QmZUCypJ3zch9GpWgJffKdhhgdUxEAorFsvaekRZsv4VDV' } },
	{ token_type: 'HipHopHead.29.226.1091310', metadata: { media: 'QmRHnwyP3x8FQdPPEoSBemgRcNhGNKvGqLeSFnfUqPNiGw' } },
	{ token_type: 'HipHopHead.30.183', metadata: { media: 'QmZsR3ZLteEZFc7PgPmQ7VaMKW2h87edNtBWPjs6U3rVvh' } },
	{ token_type: 'HipHopHead.31.55', metadata: { media: 'QmSw8p3zmHDGY1ePA1F7xGmJFHqmaSXBFLtjzPm3oafYR2' } },
	{ token_type: 'HipHopHead.32.110', metadata: { media: 'QmRhHL3dAFfTLMkX3RgGuTBpWQZCQGJNN9rjp16aR1CCLJ' } },
	{ token_type: 'HipHopHead.32.212', metadata: { media: 'QmQz6G4mgTz5F6zjdy6Zzi46FjpKU9QEZgJbqqXP3bqk34' } },
	{ token_type: 'HipHopHead.32.212.V2', metadata: { media: 'QmaV81sUNMaHCsn5tLbhSUTPmk7PuKxFwTeRvqXVJeEZzK' } },
	{ token_type: 'HipHopHead.32.348', metadata: { media: 'QmP3DLavA9zwHRgRDqnaQtFaMaBF4MeSN4abQNJseaTM7q' } },
	{ token_type: 'HipHopHead.32.348v2', metadata: { media: 'QmPyqNroXuNzpzR6UMV3hSnhkFBvkBpLxsqSAEcsix7iXF' } },
	{ token_type: 'HipHopHead.36.308', metadata: { media: 'QmYPNh91PbeEARzBuu8954wrNCxjmkaLWtNiT7mTitVe57' } },
	{ token_type: 'HipHopHead.37.325', metadata: { media: 'QmXk8vmxXaAszYrUnvqLiJqHyhffhJpPvp7USoZFSxfx4q' } },
	{ token_type: 'HipHopHead.9.202.21522', metadata: { media: 'QmeKrG48dqMUQR3N6kAGYvvu4xASQP3DEay9shkgpo6i4N' } },
];

export const uhhmTokenIds = data.map(({ token_type }) => {
	if (token_type === 'HipHopHead.10.229.182114' && process.env.REACT_APP_ENV === 'prod') {
		token_type = 'HipHopHead.yar10.229.182114'
	}
	return token_type + ':1'
});