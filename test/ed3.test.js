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
	connection, initContract, getAccount, getAccountBalance,
	contract, contractAccount, contractName, contractMethods, createAccessKeyAccount,
	createOrInitAccount,
	getContract,
	credentials,
} = testUtils;
const {
	networkId, GAS, GUESTS_ACCOUNT_SECRET,

	contractId,
	marketId,
	fungibleId,
	
} = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;

// this is used in creating the marketplace, tracks bids up to 3 most recent, default is 1
const BID_HISTORY_LENGTH = 3;
const DELIMETER = '||';


// metadata for sold tokens to have correct media link

const GATEWAY_BASE = 'https://cloudflare-ipfs.com/ipfs/';
const DWEB_BASE = 'http://dweb.link/ipfs/';
const IPFS_BASE = 'https://ipfs.io/ipfs/';
const NEAR_BASE = 'https://near.mypinata.cloud/ipfs/';
const LOW_RES_GIF = '/low-res.gif';
const VIDEO = '/1.m4v';

let {data} = require('../src/tokens');

data = data.map((d) => {
	const hash = d.metadata.media;
	d.metadata.media = hash + LOW_RES_GIF;
	return d;
});

/// CURRENT CONTRACT ID
/// dev-1623990723679-78605620599599

// tokens going on sale (:3)
const edition = ':3';

const saleTokens = data.map(({ token_type, metadata }) => ({
	token_type,
	token_id: token_type + edition,
	metadata: {
		...metadata,
		issued_at: Date.now().toString(),
	},
	perpetual_royalties: {
		['escrow-42.uhhm.near']: 1000,
		'uhhm.near': 100,
		'andreleroydavis.near': 200,
		'edyoung.near': 200,
	}
}));

const ownerId = 'owner.' + contractId;
/// run tests

describe('deploy contract ' + contractName, () => {

	let owner, storageMarket;

	beforeAll(async () => {
		// await initContract();

		// ownerId = 'owner-' + now + '.' + contractId;
		owner = await createOrInitAccount(ownerId, credentials.private_key, '20');
		// owner = await getAccount(ownerId, '10', credentials.private_key);
		console.log('\n\n Owner accountId:', ownerId, '\n\n');

		/// find out how much needed for market storage
		storageMarket = await contractAccount.viewFunction(marketId, 'storage_amount');
		console.log('\n\n storageMarket:', storageMarket, '\n\n');
	});

	test('owner creates saleTokens and approves', async () => {
		
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
					console.log('\n\n minted', saleTokens[i].token_id, i+1);
				} catch (e) {
					console.log('\n\n failed to mint', saleTokens[i].token_id, i+1);
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
						msg: JSON.stringify({ is_auction: true, sale_conditions: {
							[fungibleId]: '100'
						} })
					},
					gas: GAS,
					attachedDeposit: parseNearAmount('0.01')
				});
				console.log('\n\n approved', saleTokens[i].token_id, i+1);
			} catch(e) {
				console.log('\n\n failed to approve', saleTokens[i].token_id, i+1);
				console.warn(e);
			}
		}
		
	});


});