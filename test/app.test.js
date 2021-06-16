const fs = require('fs');
const BN = require('bn.js');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');
const {data} = require('../src/tokens');

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
	networkId, GAS, GUESTS_ACCOUNT_SECRET
} = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;

// this is used in creating the marketplace, tracks bids up to 3 most recent, default is 1
const BID_HISTORY_LENGTH = 3;
const DELIMETER = '||';

const now = Date.now();

/// token setup from data
/// NEVER sell :1 tokens, they are reserve

const uhhmTokens = data.map(({ token_type, metadata }) => ({
	token_type,
	token_id: token_type + ':1',
	metadata: {
		...metadata,
		issued_at: Date.now().toString(),
	},
	perpetual_royalties: {
		'escrow-42.uhhm.near': 1000,
		'uhhm.near': 100,
		'andreleroydavis.near': 200,
		'edyoung.near': 200,
	}
}));

// tokens going on sale (:2)

const saleTokens = data.map(({ token_type, metadata }) => ({
	token_type,
	token_id: token_type + ':2',
	metadata: {
		...metadata,
		issued_at: Date.now().toString(),
	},
	perpetual_royalties: {
		'escrow-42.uhhm.near': 1000,
		'uhhm.near': 100,
		'andreleroydavis.near': 200,
		'edyoung.near': 200,
	}
}));

const contractId = contractAccount.accountId;
console.log('\n\n contractId:', contractId, '\n\n');

const fungibleId = 'dev-1623722036493-86801174308452'
const marketId = 'market.' + contractId;

/// run tests

describe('deploy contract ' + contractName, () => {

	let owner, ownerId, marketAccount, storageMarket;

	/// most of the following code in beforeAll can be used for deploying and initializing contracts
	/// skip tests if you want to deploy to production or testnet without any NFTs
	beforeAll(async () => {
		await initContract();

		/// some users
		ownerId = 'owner-' + now + '.' + contractId;
		owner = await getAccount(ownerId, '50', credentials.private_key);
		console.log('\n\n Alice accountId:', ownerId, '\n\n');

		// token types and caps
		const supply_cap_by_type = uhhmTokens.map(({ token_type }) => ({
			[token_type]: '47'
		})).reduce((a, c) => ({ ...a, ...c }), {});

		console.log('\n\n', supply_cap_by_type, '\n\n');

		await contractAccount.functionCall({
			contractId,
			methodName: 'add_token_types',
			args: { supply_cap_by_type },
			gas: GAS
		});


		/** 
		 * Deploy the Market Contract and connect it to the NFT contract (contractId)
		 * and the FT contract (fungibleAccount.[contractId])
		 */

		/// default option for markets, init with all FTs you want it to support
		const ft_token_ids = [fungibleId];

		/// create or get market account and deploy market.wasm (if not already deployed)
		marketAccount = await createOrInitAccount(marketId, GUESTS_ACCOUNT_SECRET);
		const marketAccountState = await marketAccount.state();
		console.log('\n\nstate:', marketAccountState, '\n\n');
		if (marketAccountState.code_hash === '11111111111111111111111111111111') {

			const marketContractBytes = fs.readFileSync('./out/market.wasm');
			console.log('\n\n deploying marketAccount contractBytes:', marketContractBytes.length, '\n\n');
			const newMarketArgs = {
				owner_id: contractId,
				ft_token_ids,
				bid_history_length: BID_HISTORY_LENGTH,
			};
			const actions = [
				deployContract(marketContractBytes),
				functionCall('new', newMarketArgs, GAS)
			];
			await marketAccount.signAndSendTransaction({ receiverId: marketId, actions });

			/// NOTE market must register for all ft_token_ids it wishes to use (e.g. use this loop for standard fts)
			ft_token_ids.forEach(async (ft_token_id) => {
				const deposit = await marketAccount.viewFunction(ft_token_id, 'storage_balance_bounds');
				await marketAccount.functionCall({
					contractId: ft_token_id,
					methodName: 'storage_deposit',
					args: {},
					gas: GAS,
					attachedDeposit: deposit.min
				});
			});
		}
		// get all supported tokens as array
		const supportedTokens = await marketAccount.viewFunction(marketId, 'supported_ft_token_ids');
		console.log('\n\n market supports these fungible tokens:', supportedTokens, '\n\n');

		// should be [false], just testing api
		const added = await contractAccount.functionCall({
			contractId: marketId,
			methodName: 'add_ft_token_ids',
			args: { ft_token_ids },
			gas: GAS,
		});
		console.log('\n\n added these tokens', supportedTokens, '\n\n');

		/// find out how much needed for market storage
		storageMarket = await contractAccount.viewFunction(marketId, 'storage_amount');
		console.log('\n\n storageMarket:', storageMarket, '\n\n');
	});

	/// !!! OWNER != contractId !!!

	test('owner mints uhhmTokens', async () => {

		for (let i = 0; i < uhhmTokens.length; i++) {
			try {
				await owner.functionCall({
					contractId,
					methodName: 'nft_mint',
					args: uhhmTokens[i],
					gas: GAS,
					attachedDeposit: parseNearAmount('0.1')
				});
				console.log('\n\n minted', uhhmTokens[i].token_id, i+1)
			} catch (e) {
				console.warn(e)
			}
		}
		
	});

	test('owner creates saleTokens and approves', async () => {

		await owner.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			gas: GAS,
			attachedDeposit: new BN(storageMarket).mul(new BN(uhhmTokens.length))
		});

		for (let i = 0; i < saleTokens.length; i++) {
			try {
				await owner.functionCall({
					contractId,
					methodName: 'nft_mint',
					args: saleTokens[i],
					gas: GAS,
					attachedDeposit: parseNearAmount('0.1')
				});
				console.log('\n\n minted', saleTokens[i].token_id, i+1)
			} catch (e) {
				console.warn(e)
			}
			try {
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
				console.log('\n\n approved', saleTokens[i].token_id, i+1)
			} catch(e) {
				console.warn(e)
			}
		}
		
	});


});