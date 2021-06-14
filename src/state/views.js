import { marketId, contractId } from '../state/near';


const BAD_OWNER_ID = ['mikedigitalegg.testnet', 'web_dev.testnet'];

export const getMarketStoragePaid = (account) => async ({ update, getState }) => {
    if (!account) return
    const { contractAccount } = getState()

    update('views', {
        marketStoragePaid: await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: account.accountId })
    })
}

export const loadItems = (account) => async ({ update, getState }) => {

    const { contractAccount } = getState()
	
    /// user tokens
    let tokens = []
    if (account) {
        const { accountId } = account
        tokens = await contractAccount.viewFunction(contractId, 'nft_tokens_for_owner', {
            account_id: account.accountId,
            from_index: '0',
            limit: '50'
        });
        const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
            account_id: account.accountId,
            from_index: '0',
            limit: '50'
        });
        // merge tokens with sale data if it's on sale
        for (let i = 0; i < tokens.length; i++) {
            const { token_id } = tokens[i];
            let sale = sales.find(({ token_id: t }) => t === token_id);
            // don't have it in state, go find sale data
            if (!sale) {
                sale = await contractAccount.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + ":" + token_id }).catch(() => { });
            }
            tokens[i] = Object.assign(tokens[i], sale || {});
        }
    }

    /// all sales
    // need to use NFT helper for deployed contract
    let sales = [];
    if (process.env.REACT_APP_API_HELPER === "true") {
        const salesUrl = batchPath + JSON.stringify([{
            contract: marketId,
            method: 'get_sales_by_nft_contract_id',
            args: {
                nft_contract_id: contractId,
            },
            batch: {
                from_index: '0', // must be name of contract arg (above)
                limit: '1000', // must be name of contract arg (above)
                step: '50', // divides contract arg 'limit'
                flatten: [], // how to combine results
            },
            sort: {
                path: 'metadata.issued_at',
            }
        }]);
        sales = (await fetch(salesUrl, { headers }).then((res) => res.json()))[0];
    } else {
        sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
            nft_contract_id: contractId,
            from_index: '0',
            limit: '50'
        });
    }
    
    const saleTokens = await contractAccount.viewFunction(contractId, 'nft_tokens_batch', {
        token_ids: sales.filter(({ nft_contract_id }) => nft_contract_id === contractId).map(({ token_id }) => token_id)
    });
    // merge sale listing with nft token data
    for (let i = 0; i < sales.length; i++) {
        const { token_id } = sales[i];
        let token = saleTokens.find(({ token_id: t }) => t === token_id);
        // don't have it in batch, go find token data
        if (!token) {
            token = await contractAccount.viewFunction(contractId, 'nft_token', { token_id });
        }
        sales[i] = Object.assign(sales[i], token);
    }
    sales = sales.filter(({ owner_id }) => !BAD_OWNER_ID.includes(owner_id));

    // all tokens
    // need to use NFT helper for deployed
    let allTokens = [];
    if (process.env.REACT_APP_API_HELPER === "true") {
        const nft_total_supply = await contractAccount.viewFunction(contractId, 'nft_total_supply');
        const allTokensUrl = batchPath + JSON.stringify([{
            contract: contractId,
            method: 'nft_tokens',
            args: {},
            batch: {
                from_index: '0', // must be name of contract arg (above)
                limit: nft_total_supply, // must be name of contract arg (above)
                step: '50', // divides contract arg 'limit'
                flatten: [], // how to combine results
            },
            sort: {
                path: 'metadata.issued_at',
            }
        }]);
        allTokens = (await fetch(allTokensUrl, { headers }).then((res) => res.json()))[0];
    } else {
        allTokens = await contractAccount.viewFunction(contractId, 'nft_tokens', {
            from_index: '0',
            limit: '50'
        });
    }

    allTokens = allTokens.filter(({ owner_id }) => !BAD_OWNER_ID.includes(owner_id));

    update('views', { tokens, sales, allTokens })
    return { tokens, sales, allTokens }
};
