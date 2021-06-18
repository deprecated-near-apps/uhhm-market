import { contractId, marketId, fungibleId } from '../utils/near-utils';
import { setDialog } from '../state/app';
import { GAS } from '../state/near';
import { parseAmount, formatAmount, validateAmount } from '../utils/format';


export const handlePlaceBid = (account, token, minBid) => async ({ dispatch, getState }) => {
	const result = await dispatch(setDialog({
		msg: 'Enter Your Bid Amount',
		acceptLabel: 'Place Bid',
		input: [
			{ placeholder: 'Amount', type: 'number' },
		]
	}));
    
	const isValid = validateAmount(result[0]);
	if (!isValid) {
		return dispatch(setDialog({
			msg: 'Not a valid amount. Please try again!',
			info: true
		}));
	}
	const amount = parseAmount(result[0]);
    
	const { views: { credits } } = getState();
	if (parseInt(credits) < parseInt(amount)) {
		return dispatch(setDialog({
			msg: `You don't have enough credits. Try buying some more!`,
			info: true
		}));
	}

	if (parseInt(amount) <= minBid) {
		return dispatch(setDialog({
			msg: 'The minimum bid is ' + formatAmount(minBid),
			info: true
		}));
	}

	const { nft_contract_id, token_id } = token;
	console.log({
		receiver_id: marketId,
		amount,
		msg: JSON.stringify({ nft_contract_id, token_id })
	});
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

};
