const fs = require('fs');
const testUtils = require('../test/test-utils');
const { 
	GAS
} = getConfig();
const { 
	createOrInitAccount,
} = testUtils;


/// Manual deployment

// 'vadim-nfts.testnet'
// near create_account market.name.testnet --masterAccount=name.testnet --initial-balance 50
// near deploy --accountId=market.name.testnet --wasmFile=./out/market.wasm
// near deploy --accountId=name.testnet --wasmFile=./out/main.wasm
// near call market.name.testnet new '{"owner_id": "name.testnet", "ft_token_ids": []}' --accountId=name.testnet
// near call name.testnet new '{"owner_id":"name.testnet","metadata":{"spec":"name","name":"NFT","symbol":"NFT"},"supply_cap_by_type":{"test": "1000000"}}' --accountId=name.testnet

const deployAccount = await createOrInitAccount(process.env.DEPLOY_ACCOUNT_ID, process.env.DEPLOY_ACCOUNT_SECRET);
const contractBytes = fs.readFileSync('./out/main.wasm');
console.log('\n\n Deploying NFT Contract \n\n');
const newArgs = {
    owner_id: contractAccount.accountId,
    metadata: {
        spec: 'nft-1',
        name: 'vadim-nfts',
        symbol: 'VNFT',
    },
};

const actions = [
    deployContract(contractBytes),
    functionCall('new', newArgs, GAS)
];
await deployAccount.signAndSendTransaction(stableId, actions);



/// TODO clean up market deployment


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
    await marketAccount.signAndSendTransaction(marketId, actions);

    /// NOTE market must register for all ft_token_ids it wishes to use (e.g. use this loop for standard fts)
    ft_token_ids.forEach(async (ft_token_id) => {
        const deposit = await marketAccount.viewFunction(ft_token_id, 'storage_minimum_balance');
        await marketAccount.functionCall(ft_token_id, 'storage_deposit', {}, GAS, deposit);
    })
}
// get all supported tokens as array
const supportedTokens = await marketAccount.viewFunction(marketId, "supported_ft_token_ids");
console.log('\n\n market supports these fungible tokens:', supportedTokens, '\n\n');

// should be [false], just testing api
const added = await contractAccount.functionCall(marketId, "add_ft_token_ids", { ft_token_ids }, GAS);
console.log('\n\n added these tokens', supportedTokens, added, '\n\n');

/// find out how much needed for market storage
storageMarket = await contractAccount.viewFunction(marketId, 'storage_amount');
console.log('\n\n storageMarket:', storageMarket, '\n\n');

