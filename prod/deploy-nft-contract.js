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
	contractAccount
} = testUtils;

const {
	networkId, GAS, GUESTS_ACCOUNT_SECRET,

	contractId,
	marketId,
	fungibleId,
	
} = getConfig(true);

async function init () {
	console.log(contractId)
	
	return console.log('doing nothing')

	const contractBytes = fs.readFileSync('./out/main.wasm');
	console.log('\n\n deploying contractBytes:', contractBytes.length, '\n\n');
	const actions = [
		deployContract(contractBytes),
	];
	await contractAccount.signAndSendTransaction({ receiverId: contractId, actions });
}
init()