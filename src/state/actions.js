import { contractId, marketId, fungibleId } from '../utils/near-utils'
import BN from 'bn.js'
import { setDialog } from '../state/app';
import { GAS, parseNearAmount, contractId } from '../state/near';
import { parseAmount, formatAmount } from '../utils/format';

export const handlePlaceBid = (account, token, minBid) => async ({ dispatch }) => {
    const result = await dispatch(setDialog({
        msg: 'How much would you like to bid?',
        input: [
            { placeholder: 'Amount' },
        ]
    }));
    const amount = parseAmount(result[0])

    console.log(minBid)

    if (parseInt(amount, 10) < minBid) {
        return dispatch(setDialog({
            msg: 'Sorry the minimum bid is ' + formatAmount(minBid),
            info: true
        }));
    }

    const { nft_contract_id, token_id } = token
    console.log({
        receiver_id: marketId,
        amount,
        msg: JSON.stringify({ nft_contract_id, token_id })
    })
    await account.functionCall({
        contractId: fungibleId,
        methodName: 'ft_transfer_call',
        args: {
            receiver_id: marketId,
            amount,
            msg: JSON.stringify({ nft_contract_id, token_id })
        },
        gas: GAS,
        attachedDeposit: 1
    });

}


/// from nft-market

export const handleMint = async (account, royalties, media, validMedia) => {
    if (!media.length || !validMedia) {
        alert('Please enter a valid Image Link. You should see a preview below!');
        return;
    }

    // shape royalties data for minting and check max is < 20%
    let perpetual_royalties = Object.entries(royalties).map(([receiver, royalty]) => ({
        [receiver]: royalty * 100
    })).reduce((acc, cur) => Object.assign(acc, cur), {});
    if (Object.values(perpetual_royalties).reduce((a, c) => a + c, 0) > 2000) {
        return alert('Cannot add more than 20% in perpetual NFT royalties when minting');
    }
    
    const metadata = { 
        media,
        issued_at: Date.now().toString()
    };
    const deposit = parseNearAmount('0.1');
    await account.functionCall(contractId, 'nft_mint', {
        token_id: 'token-' + Date.now(),
        metadata,
        perpetual_royalties
    }, GAS, deposit);
};

export const handleAcceptOffer = async (account, token_id, ft_token_id) => {
    if (ft_token_id !== 'near') {
        return alert('currently only accepting NEAR offers');
    }
    await account.functionCall(marketId, 'accept_offer', {
        nft_contract_id: contractId,
        token_id,
        ft_token_id,
    }, GAS);
};

export const handleRegisterStorage = async (account) => {
    // WARNING this just pays for 10 "spots" to sell NFTs in marketplace vs. paying each time
    await account.functionCall(
        marketId,
        'storage_deposit',
        {},
        GAS,
        new BN(await account.viewFunction(marketId, 'storage_amount', {}, GAS)).mul(new BN('10'))
    )
};

export const handleSaleUpdate = async (account, token_id, newSaleConditions) => {
    const sale = await account.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + ":" + token_id }).catch(() => { });
    if (sale) {
        await account.functionCall(marketId, 'update_price', {
            nft_contract_id: contractId,
            token_id,
            ft_token_id: newSaleConditions[0].ft_token_id,
            price: newSaleConditions[0].price
        }, GAS);
    } else {
        await account.functionCall(contractId, 'nft_approve', {
            token_id,
            account_id: marketId,
            msg: JSON.stringify({ sale_conditions: newSaleConditions })
        }, GAS, parseNearAmount('0.01'));
    }
};