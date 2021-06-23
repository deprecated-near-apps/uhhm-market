const fs = require('fs');
const BN = require('bn.js');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');
const { credentials } = require('./near-utils');

const {
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount } },
	transactions: { deployContract, functionCall },
} = nearAPI;

const {
	loadCredentials,
	contractAccount
} = testUtils;

const {
	networkId, GAS, GUESTS_ACCOUNT_SECRET,

	contractId,
	marketId,
	ownerId,
	fungibleId,
	
} = getConfig(true);

async function init () {
	// console.log(contractAccount)
	const { private_key } = loadCredentials(marketId)
	const marketAccount = await testUtils.initAccount(marketId, private_key)
	console.log(marketAccount)

	return console.log('doing nothing')

	// const contractBytes = fs.readFileSync('./out/main.wasm');
	// console.log('\n\n deploying contractBytes:', contractBytes.length, '\n\n');
	// const actions = [
	// 	deployContract(contractBytes),
	// ];
	// await contractAccount.signAndSendTransaction({ receiverId: contractId, actions });

	const marketBytes = fs.readFileSync('./out/market.wasm');
	console.log('\n\n deploying marketBytes:', marketBytes.length, '\n\n');
	const marketActions = [
		deployContract(marketBytes),
	];
	await marketAccount.signAndSendTransaction({ receiverId: marketId, actions: marketActions });
}
init()