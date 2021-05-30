const fs = require('fs');
const BN = require('bn.js');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const { 
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount }},
	transactions: { deployContract, functionCall },
} = nearAPI;
const { 
	connection, initContract, getAccount, getAccountBalance,
	contract, contractAccount, contractName, contractMethods, createAccessKeyAccount,
	createOrInitAccount,
	getContract,
} = testUtils;
const { 
	networkId, GAS, GUESTS_ACCOUNT_SECRET
} = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

/// setup consts
const DELIMETER = '||';

const now = Date.now();
const tokenTypes = [
	// one unique type
	`typeA:${now}`,
		// 2 tokens of same type
	`typeB:${now}`,
	`typeB:${now}`,
];
const tokenIds = tokenTypes.map((type, i) => `${type}:${i}`);
const contract_royalty = 500;

const metadata = {
	media: 'https://media1.tenor.com/images/4c1d96a989150e7019bfbabbebd2ff36/tenor.gif?itemid=20269144',
	issued_at: now.toString()
};
const metadata2 = {
	media: 'https://media1.tenor.com/images/818161c07948bac34aa7c5f5712ec3d7/tenor.gif?itemid=15065455',
	issued_at: now.toString()
};

/// contractAccount.accountId is the NFT contract and contractAccount is the owner
/// see initContract in ./test-utils.js for details
const contractId = contractAccount.accountId;
console.log('\n\n contractId:', contractId, '\n\n');
/// the test fungible token
const fungibleId = 'fungible.' + contractId;
/// the market contract
const marketId = 'market.' + contractId;

describe('deploy contract ' + contractName, () => {

	let alice, aliceId, bob, bobId,
		fungibleAccount, marketAccount,
		storageMinimum, storageMarket;

	/// most of the following code in beforeAll can be used for deploying and initializing contracts
	/// skip tests if you want to deploy to production or testnet without any NFTs
	beforeAll(async () => {
	    await initContract();

		/// some users
		aliceId = 'alice-' + now + '.' + contractId;
		alice = await getAccount(aliceId);
		console.log('\n\n Alice accountId:', aliceId, '\n\n');

		bobId = 'bob-' + now + '.' + contractId;
		bob = await getAccount(bobId);
		console.log('\n\n Bob accountId:', bobId, '\n\n');

		// set contract royalty to 5%
		await contractAccount.functionCall({
			contractId: contractName,
			methodName: 'set_contract_royalty',
			args: { contract_royalty },
			gas: GAS
		});
		
		// set token types and hard supply caps
		const supply_cap_by_type = {
			[tokenTypes[0]]: '1',
			[tokenTypes[1]]: '500',
		};
		await contractAccount.functionCall({
			contractId,
			methodName: 'add_token_types',
			args: { supply_cap_by_type },
			gas: GAS
		});
		
		/// create or get fungibleAccount and deploy ft.wasm (if not already deployed)
		fungibleAccount = await createOrInitAccount(fungibleId, GUESTS_ACCOUNT_SECRET);
		const fungibleAccountState = await fungibleAccount.state();
		console.log('\n\n state:', fungibleAccountState, '\n\n');
		if (fungibleAccountState.code_hash === '11111111111111111111111111111111') {
			const fungibleContractBytes = fs.readFileSync('./out/ft.wasm');
			console.log('\n\n deploying fungibleAccount contractBytes:', fungibleContractBytes.length, '\n\n');
			const newFungibleArgs = {
				/// will have totalSupply minted to them
				owner_id: contractId,
				total_supply: parseNearAmount('1000000'),
				name: 'Test Fungible T',
				symbol: 'TFT',
				// not set by user request
				version: '1',
				reference: 'https://github.com/near/core-contracts/tree/master/w-near-141',
				reference_hash: '7c879fa7b49901d0ecc6ff5d64d7f673da5e4a5eb52a8d50a214175760d8919a',
				decimals: 24,
			};
			const actions = [
				deployContract(fungibleContractBytes),
				functionCall('new', newFungibleArgs, GAS)
			];
			await fungibleAccount.signAndSendTransaction({ receiverId: fungibleId, actions });
			/// find out how much needed to store for FTs
			storageMinimum = await contractAccount.viewFunction(fungibleId, 'storage_minimum_balance');
			console.log('\n\n storageMinimum:', storageMinimum, '\n\n');
			/// pay storageMinimum for all the royalty receiving accounts
			const promises = [];
			for (let i = 1; i < 6; i++) {
				promises.push(fungibleAccount.functionCall({
					contractId: fungibleId,
					methodName: 'storage_deposit',
					args: { account_id: `a${i}.testnet` },
					gas: GAS,
					attachedDeposit: storageMinimum
				}));
			}
			await Promise.all(promises);
		} else {
			/// find out how much needed to store for FTs
			storageMinimum = await contractAccount.viewFunction(fungibleId, 'storage_minimum_balance');
			console.log('\n\n storageMinimum:', storageMinimum, '\n\n');
		}

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
				ft_token_ids
			};
			const actions = [
				deployContract(marketContractBytes),
				functionCall('new', newMarketArgs, GAS)
			];
			await marketAccount.signAndSendTransaction({ receiverId: marketId, actions });

			/// NOTE market must register for all ft_token_ids it wishes to use (e.g. use this loop for standard fts)
			ft_token_ids.forEach(async (ft_token_id) => {
				const deposit = await marketAccount.viewFunction(ft_token_id, 'storage_minimum_balance');
				await marketAccount.functionCall({
					contractId: ft_token_id,
					methodName: 'storage_deposit',
					args: {},
					gas: GAS,
					attachedDeposit: deposit
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

	test('NFT enumerable tests (no tokens)', async () => {
		const nft_supply_for_owner = await bob.viewFunction(contractName, 'nft_supply_for_owner', { account_id: bobId });
		console.log('\n\n nft_supply_for_owner', nft_supply_for_owner, '\n\n');
		expect(nft_supply_for_owner).toEqual('0');
		// messing around with index and limit
		const bobTokens = await bob.viewFunction(contractName, 'nft_tokens_for_owner', {
			account_id: bobId, from_index: '1001', limit: '1000'
		});
		console.log('\n\n bobTokens', bobTokens, '\n\n');
		expect(bobTokens.length).toEqual(0);
	});

	test('Alice mints nft and approves a sale for a fixed amount of NEAR', async () => {
		const token_id = tokenIds[0];
		await alice.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		await alice.functionCall({
			contractId: contractId,
			methodName: 'nft_mint',
			args: {
				token_id,
				metadata,
				token_type: tokenTypes[0],
				perpetual_royalties: {
					'a1.testnet': 500,
					'a2.testnet': 250,
					'a3.testnet': 250,
					'a4.testnet': 250,
					'a5.testnet': 250,
					// 'a6.testnet': 250,
					// 'a7.testnet': 250,
				},
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});

		const price = parseNearAmount('1');
		let sale_conditions = [
			{
				ft_token_id: 'near',
				price 
			}
		];

		await alice.functionCall({
			contractId: contractId,
			methodName: 'nft_approve',
			args: {
				token_id,
				account_id: marketId,
				msg: JSON.stringify({ sale_conditions })
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.01')
		});

		const sale = await alice.viewFunction(marketId, 'get_sale', {
			nft_contract_token: contractId + DELIMETER + token_id
		});
		console.log('\n\n get_sale result for nft', sale, '\n\n');
		expect(sale.conditions.near).toEqual(price);
	});

	test('token transfer locked - owner unlocks token transfer token type', async () => {
		const token_id = tokenIds[0];
		try {
			await contractAccount.functionCall({
				contractId,
				methodName: 'nft_transfer',
				args: {
					receiver_id: bobId,
					token_id
				},
				gas: GAS,
				attachedDeposit: 1
			});
			expect(false);
		} catch(e) {
			expect(true);
		}

		// unlock all token types
		await contractAccount.functionCall({
			contractId,
			methodName: 'unlock_token_types',
			args: {
				token_types: tokenTypes
			},
			gas: GAS
		});
		const tokenLocked = await contractAccount.viewFunction(contractName, 'is_token_locked', { token_id });
		expect(tokenLocked).toEqual(false);

		// should be none (we default unlocked token_type in constructor -> test-utils.js)
		const typesLocked = await contractAccount.viewFunction(contractName, 'get_token_types_locked');
		console.log(typesLocked);
		expect(typesLocked.length).toEqual(0);
	});

	test('get sales supply', async () => {
		const supply = await contractAccount.viewFunction(marketId, 'get_supply_sales', {});
		console.log('\n\n', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('get sales & supply by owner id', async () => {
		const sales_by_owner_id = await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
			account_id: aliceId,
			from_index: '0',
			limit: '50'
		});
		console.log('\n\n sales_by_owner_id', sales_by_owner_id, '\n\n');
		expect(sales_by_owner_id.length).toEqual(1);

		const supply = await contractAccount.viewFunction(marketId, 'get_supply_by_owner_id', {
			account_id: aliceId,
		});
		console.log('\n\n get_supply_by_owner_id', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('get sales & supply by nft contract id', async () => {
		const sales_by_nft_contract_id = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		});
		console.log('\n\n sales_by_nft_contract_id', sales_by_nft_contract_id, '\n\n');
		expect(sales_by_nft_contract_id.length > 0).toEqual(true);

		const supply = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_contract_id', {
			nft_contract_id: contractId,
		});
		console.log('\n\n get_supply_by_nft_contract_id', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('get sales & supply by nft token type', async () => {
		const sales_by_nft_token_type = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
			token_type: tokenTypes[0],
			from_index: '0',
			limit: '50'
		});
		console.log('\n\n sales_by_nft_token_type', sales_by_nft_token_type, '\n\n');
		expect(sales_by_nft_token_type.length > 0).toEqual(true);

		const supply = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_token_type', {
			token_type: tokenTypes[0],
		});
		console.log('\n\n get_supply_by_nft_token_type', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('bob purchase nft with NEAR', async () => {
		const token_id = tokenIds[0];
		const aliceBalanceBefore = await getAccountBalance(aliceId);
		/// purchase = near deposit = sale.price -> nft_transfer -> royalties transfer near
		await bob.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: {
			  nft_contract_id: contractId,
			  token_id,
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		/// check owner
		const token = await contract.nft_token({ token_id });
		expect(token.owner_id).toEqual(bobId);
		// check alice balance went up by over 80% of 1 N
		const aliceBalanceAfter = await getAccountBalance(aliceId);
		expect(new BN(aliceBalanceAfter.total).sub(new BN(aliceBalanceBefore.total)).gt(new BN(parseNearAmount('0.79')))).toEqual(true);
	});

	test('contract account registers bob with market contract', async () => {
		await contractAccount.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: { account_id: bobId },
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
		expect(result).toEqual(parseNearAmount('0.01'));
	});

	test('bob withdraws storage', async () => {
		await bob.functionCall({
			contractId: marketId,
			methodName: 'storage_withdraw',
			args: {},
			gas: GAS,
			attachedDeposit: 1
		});
		const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
		expect(result).toEqual('0');
	});

	test('bob approves sale with FT and NEAR (fixed prices)', async () => {
		const token_id = tokenIds[0];
		await bob.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		await bob.functionCall({
			contractId: fungibleId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMinimum
		});
		const token = await contract.nft_token({ token_id });
		let sale_conditions = [
			{
				ft_token_id: fungibleId,
				price: parseNearAmount('25')
			},
			{
				ft_token_id: 'near',
				price: parseNearAmount('5')
			}
		];

		console.log('\n\n sale_conditions', sale_conditions, '\n\n');
		console.log('\n\n token.royalty', token.royalty, '\n\n');

		if (sale_conditions.length + token.royalty.length > 8) {
			throw new Error("Cannot have more than 8 royalties + sale collateral at the same time");
		}

		await bob.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
				token_id,
				account_id: marketId,
				msg: JSON.stringify({ sale_conditions })
			},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n get_sale', sale, '\n\n');
		expect(sale.conditions[fungibleId]).toEqual(parseNearAmount('25'));
	});

	test('enumerable tests', async () => {
		const total_supply = await bob.viewFunction(contractName, 'nft_total_supply', {});
		console.log('\n\n total_supply', total_supply, '\n\n');
		// could be several tests in, with many tokens minted
		const nft_supply_for_owner = await bob.viewFunction(contractName, 'nft_supply_for_owner', { account_id: bobId });
		console.log('\n\n nft_supply_for_owner', nft_supply_for_owner, '\n\n');
		expect(nft_supply_for_owner).toEqual('1');
		const tokens = await bob.viewFunction(contractName, 'nft_tokens', { from_index: '0', limit: '1000' });
		console.log('\n\n nft_tokens', tokens, '\n\n');
		// proxy for total supply with low limits, could be several tests in, with many tokens minted
		expect(tokens.length > 0).toEqual(true);
		const bobTokens = await bob.viewFunction(contractName, 'nft_tokens_for_owner', { account_id: bobId, from_index: '0', limit: '1000' });
		console.log('\n\n nft_tokens_for_owner (bob)', bobTokens, '\n\n');
		expect(bobTokens.length).toEqual(1);
	});
    
	test('bob changes price in FT to 20 N', async () => {
		const token_id = tokenIds[0];
		await bob.functionCall({
			contractId: marketId,
			methodName: 'update_price',
			args: {
			  nft_contract_id: contractId,
			  token_id,
			  ft_token_id: fungibleId,
			  price: parseNearAmount('20')
			},
			gas: GAS,
			attachedDeposit: 1
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n get_sale (updated price to 20 N)', sale, '\n\n');
		expect(sale.conditions[fungibleId]).toEqual(parseNearAmount('20'));
	});

	test('contract owner makes low bid', async () => {
		const token_id = tokenIds[0];
		/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
		await contractAccount.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: {
			  nft_contract_id: contractId,
			  token_id,
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		
		/// check sale should have 2 N bid for near from contract owner
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		expect(sale.bids['near'].owner_id).toEqual(contractId);
		expect(sale.bids['near'].price).toEqual(parseNearAmount('1'));
	});

	test('alice outbids contract owner', async () => {
		const token_id = tokenIds[0];

		const contractBalanceBefore = await getAccountBalance(contractId);
		/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
		await alice.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: {
			  nft_contract_id: contractId,
			  token_id
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1.1')
		});
		
		/// check sale should have 1.1 N bid for near from alice
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		expect(sale.bids['near'].owner_id).toEqual(aliceId);
		expect(sale.bids['near'].price).toEqual(parseNearAmount('1.1'));

		// contract owner gets back 1 N - gas > 0.9
		const contractBalanceAfter = await getAccountBalance(contractId);

		expect(new BN(contractBalanceAfter.total).sub(new BN(contractBalanceBefore.total)).gt(new BN(parseNearAmount('0.9')))).toEqual(true);
	});

	test('alice gets 100 FTs', async () => {
		await alice.functionCall({
			contractId: fungibleId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMinimum
		});
		let amount = parseNearAmount('100');
		await contractAccount.functionCall({
			contractId: fungibleId,
			methodName: 'ft_transfer',
			args: {
			  receiver_id: aliceId,
			  amount: parseNearAmount('100')
			},
			gas: GAS,
			attachedDeposit: 1
		});
		/// check balance
		const balance = await contractAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: aliceId });
		expect(balance).toEqual(amount);
	});

	test('contract owner bids with fts', async () => {
		const token_id = tokenIds[0];
		await contractAccount.functionCall({
			contractId: fungibleId,
			methodName: 'ft_transfer_call',
			args: {
			  receiver_id: marketId,
			  amount: parseNearAmount('10'),
			  msg: JSON.stringify({ nft_contract_id: contractId, token_id })
			},
			gas: GAS,
			attachedDeposit: 1
		});
		// marketplace contract has 10 FTs (a bid)
		const marketFTBalance = await contractAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: marketId });
		expect(marketFTBalance).toEqual(parseNearAmount('10'));
	});

	test('alice purchase NFT with FT -> alice gets NEAR back, contract owner gets FTs back', async () => {
		const token_id = tokenIds[0];
		const ownerBalanceBefore = await contractAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: contractId });
		const aliceBalanceBefore = await getAccountBalance(aliceId);
		/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
		await alice.functionCall({
			contractId: fungibleId,
			methodName: 'ft_transfer_call',
			args: {
			  receiver_id: marketId,
			  amount: parseNearAmount('20'),
			  msg: JSON.stringify({ nft_contract_id: contractId, token_id })
			},
			gas: GAS,
			attachedDeposit: 1
		});
		/// check owner
		const token = await contract.nft_token({ token_id });
		expect(token.owner_id).toEqual(aliceId);
		/// check FT balances
		const aliceBalance = await alice.viewFunction(fungibleId, 'ft_balance_of', { account_id: aliceId });
		expect(aliceBalance).toEqual(parseNearAmount('80'));
		const marketBalance = await marketAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: marketId });
		console.log('\n\n ft_balance_of fungibleId', marketBalance, '\n\n');
		// marketplace contract has NO MORE FTs (bids were paid back)
		const marketFTBalance = await contractAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: marketId });
		expect(marketFTBalance).toEqual(parseNearAmount('0'));
		/// bob gets 80% of the FTs
		const bobBalance = await bob.viewFunction(fungibleId, 'ft_balance_of', { account_id: bobId });
		expect(bobBalance).toEqual(parseNearAmount('16'));
		// alice's bid of 1.1 NEAR was returned (check N diff > than 1.1 - gas)
		const ownerBalanceAfter = await contractAccount.viewFunction(fungibleId, 'ft_balance_of', { account_id: contractId });
		const aliceBalanceAfter = await getAccountBalance(aliceId);
		expect(new BN(aliceBalanceAfter.total).sub(new BN(aliceBalanceBefore.total)).gt(new BN(parseNearAmount('1')))).toEqual(true);
		// Owner received 5% royalty in FTs on NFT purchase
		expect(new BN(ownerBalanceAfter).sub(new BN(ownerBalanceBefore)).toString()).toEqual(parseNearAmount('11'));
	});

	/// near bid

	test('bob fails to mint past hard cap for token type', async () => {
		const token_id = tokenIds[1];
		try {
			await bob.functionCall({
				contractId,
				methodName: 'nft_mint',
				args: {
				  token_id,
				  metadata,
				  token_type: tokenTypes[0]
				},
				gas: GAS,
				attachedDeposit: parseNearAmount('1')
			  });
			expect(false);
		} catch (e) {
			expect(true);
		}
		const hardCap = await bob.viewFunction(contractId, 'nft_supply_for_type', { token_type: tokenTypes[0] });
		expect(hardCap).toEqual('1');
	});

	test('bob: nft mints (different token_type) 2 new tokens, approve sale with NEAR open for bids', async () => {
		let token_id = tokenIds[1];
		await bob.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});

		/// bob just double paid for storage (check this)
		const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
		expect(result).toEqual(parseNearAmount('0.02'));

		await bob.functionCall({
			contractId,
			methodName: 'nft_mint',
			args: {
			  token_id,
			  metadata,
			  token_type: tokenTypes[1],
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await bob.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
			  token_id,
			  account_id: marketId,
			  perpetual_royalties: { bobId: 500 },
			  msg: '{"sale_conditions":[{"ft_token_id":"near"}]}'
			},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n', sale, '\n\n');
		expect(sale.conditions["near"]).toEqual(parseNearAmount('0'));

		token_id = tokenIds[2];
		await bob.functionCall({
			contractId,
			methodName: 'nft_mint',
			args: {
			  token_id,
			  metadata: metadata2,
			  token_type: tokenTypes[2],
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await bob.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
			  token_id,
			  account_id: marketId,
			  perpetual_royalties: { bobId: 500 },
			  msg: '{"sale_conditions":[{"ft_token_id":"near"}]}'
			},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const sale2 = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n', sale2, '\n\n');
		expect(sale2.conditions["near"]).toEqual(parseNearAmount('0'));
	});

	test('alice bid with NEAR', async () => {
		const token_id = tokenIds[1];
		await alice.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: {
			  nft_contract_id: contractId,
			  token_id,
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.2')
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		expect(sale.bids['near'].owner_id).toEqual(aliceId);
		expect(sale.bids['near'].price).toEqual(parseNearAmount('0.2'));
	});

	test('bob accept bid', async () => {
		const token_id = tokenIds[1];
		const bobBalanceBefore = await getAccountBalance(bobId);
		/// purchase = near deposit = sale.price -> nft_transfer -> royalties transfer near
		await bob.functionCall({
			contractId: marketId,
			methodName: 'accept_offer',
			args: {
			  nft_contract_id: contractId,
			  token_id,
			  ft_token_id: 'near'
			},
			gas: GAS
		});
		/// check owner
		const token = await contract.nft_token({ token_id });
		expect(token.owner_id).toEqual(aliceId);
		const bobBalanceAfter = await getAccountBalance(bobId);
		/// bob got close to 0.18 N (95% - gas) from this sale
		expect(new BN(bobBalanceAfter.total).sub(new BN(bobBalanceBefore.total)).gt(new BN(parseNearAmount('0.17')))).toEqual(true);
	});

	test('get_sales_by_nft_token_type', async () => {
		const tokenTypeSales = await bob.viewFunction(marketId, 'get_sales_by_nft_token_type', {
			token_type: tokenTypes[1],
			from_index: '0',
			limit: '10'
		});
		console.log('\n\n tokenTypeSales', tokenTypeSales, '\n\n');
		expect(tokenTypeSales.length).toEqual(1);
		const tokenTypeSales2 = await bob.viewFunction(marketId, 'get_sales_by_nft_token_type', {
			token_type: tokenTypes[2],
			from_index: '0',
			limit: new BN('10').toString()
		});
		console.log('\n\n tokenTypeSales', tokenTypeSales2, '\n\n');
		expect(tokenTypeSales2.length).toEqual(1);
	});

	/// for testing frontend

	test('alice lingering sale in marketplace', async () => {
		const token_id = tokenIds[1];
		await alice.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		await alice.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
			  token_id,
			  account_id: marketId,
			  perpetual_royalties: { [aliceId]: 500 },
			  msg: '{"sale_conditions":[{"ft_token_id":"near"}]}'
			},
			gas: GAS,
			attachedDeposit: storageMarket
		});
	});

});