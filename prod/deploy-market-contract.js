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
	contractAccount
} = testUtils;

const {
	networkId, GAS, GUESTS_ACCOUNT_SECRET,

	contractId,
	marketId,
	fungibleId,
	
} = getConfig(true);

console.log(marketId)

const ft_token_ids = [fungibleId];
const BID_HISTORY_LENGTH = 3;

async function init () {

	console.log(marketId)
	console.log(fungibleId)

	const { private_key } = loadCredentials(marketId)

	const marketAccount = await initAccount(marketId, private_key.split(':')[1]);
	const contractBytes = fs.readFileSync('./out/market.wasm');

	// return console.log('doing nothing')

	console.log('\n\n deploying contractBytes:', contractBytes.length, '\n\n');

	const newArgs = {
		owner_id: contractId,
		ft_token_ids,
		bid_history_length: BID_HISTORY_LENGTH,
	};
	const actions = [
		deployContract(contractBytes),
		functionCall('new', newArgs, GAS)
	];

	await marketAccount.signAndSendTransaction({ receiverId: marketId, actions });
}

init()