import { contractId, marketId, fungibleId } from '../utils/near-utils'
import BN from 'bn.js'
import { setDialog } from '../state/app';
import { GAS, parseNearAmount, contractId } from '../state/near';
import { parseAmount, formatAmount, validateAmount } from '../utils/format';


export const handlePlaceBid = (account, token, minBid) => async ({ dispatch }) => {
    const result = await dispatch(setDialog({
        msg: 'What is your bid?',
        input: [
            { placeholder: 'Amount', type: 'number' },
        ]
    }));
    const isValid = validateAmount(result[0])
    if (!isValid) {
        return dispatch(setDialog({
            msg: 'Not a valid amount. Please try again!',
            info: true
        }));
    }
    const amount = parseAmount(result[0])

    if (parseInt(amount) < minBid) {
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
