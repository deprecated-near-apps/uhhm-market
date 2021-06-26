const fs = require('fs');
const BN = require('bn.js');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const {
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount } },
	transactions: { deployContract, functionCall },
} = nearAPI;

const {
	loadCredentials,
	initAccount,
} = testUtils;

const {
	GAS,

	contractId,
	marketId,
	fungibleId,
	ownerId,

} = getConfig(true);

const DELIMETER = '||';
/// load tokens, patch and prep metadata
let { data } = require('../src/tokens');
const LOW_RES_GIF = '/low-res.gif';
data = data.map((d) => {
	if (d.token_type === 'HipHopHead.10.229.182114') {
		d.token_type = 'HipHopHead.yar10.229.182114'
	}
	const hash = d.metadata.media;
	d.metadata.media = hash + LOW_RES_GIF;
	return d;
});

// EDITION GOING ON SALE AND SHOULD YOU PAY FOR STORAGE ??????????????????/

const edition = ':30';
const PAY_FOR_MARKET_STORAGE = true

/// mint args
const saleTokens = data.map(({ token_type, metadata }, i) => ({
	token_type,
	token_id: token_type + edition,
	metadata: {
		...metadata,
		issued_at: Date.now().toString(),
	},
	perpetual_royalties: {
		['escrow-' + (i + 1) + '.uhhm.near']: 1000,
		'uhhm.near': 100,
		'andreleroydavis.near': 200,
		'edyoung.near': 200,
	}
}));

const saleArgs = JSON.stringify({
	is_auction: true, sale_conditions: {
		[fungibleId]: '4700'
	}
})

async function init() {

	const { private_key } = loadCredentials(ownerId)

	const owner = await initAccount(ownerId, private_key.split(':')[1]);

	// return console.log('do nothing')

	if (PAY_FOR_MARKET_STORAGE) {
		const storageMarket = await owner.viewFunction(marketId, 'storage_amount');
		try {
			await owner.functionCall({
				contractId: marketId,
				methodName: 'storage_deposit',
				gas: GAS,
				attachedDeposit: new BN(storageMarket).mul(new BN(saleTokens.length))
			});
		} catch (e) {
			console.warn(e);
		}
	}

	for (let i = 0; i < saleTokens.length; i++) {

		const token = await owner.viewFunction(contractId, 'nft_token', { token_id: saleTokens[i].token_id });
		if (!token) {
			try {

				await owner.functionCall({
					contractId,
					methodName: 'nft_mint',
					args: saleTokens[i],
					gas: GAS,
					attachedDeposit: parseNearAmount('0.1')
				});
				console.log('\n\n minted', saleTokens[i].token_id, i + 1);
			} catch (e) {
				console.log('\n\n failed to mint', saleTokens[i].token_id, i + 1);
				if (/expired/.test(e.toString())) {
					fs.appendFileSync('log.txt', saleTokens[i].token_id + '\n');
				}
				console.warn(e);
			}
		}

		try {
			const sale = await owner.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + saleTokens[i].token_id });
			if (sale) continue;

			await owner.functionCall({
				contractId: contractId,
				methodName: 'nft_approve',
				args: {
					token_id: saleTokens[i].token_id,
					account_id: marketId,
					msg: saleArgs
				},
				gas: GAS,
				attachedDeposit: parseNearAmount('0.01')
			});
			console.log('\n\n approved', saleTokens[i].token_id, i + 1);
		} catch (e) {
			console.log('\n\n failed to approve', saleTokens[i].token_id, i + 1);
			console.warn(e);
		}
	}
}

init()