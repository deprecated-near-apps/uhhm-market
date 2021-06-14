import React from 'react';
import getConfig from '../config';
import * as nearAPI from 'near-api-js';
import { getWallet, postSignedJson } from '../utils/near-utils';

export const {
	GAS,
	explorerUrl,
	networkId, nodeUrl, walletUrl, nameSuffix,
	contractName: contractId,
} = getConfig();

export const marketId = 'market.' + contractId;

export const {
	utils: {
		format: {
			formatNearAmount, parseNearAmount
		}
	}
} = nearAPI;

export const initNear = () => async ({ update, getState, dispatch }) => {
	const { near, wallet, contractAccount } = await getWallet();

	wallet.signIn = () => {
		wallet.requestSignIn(contractId, 'Blah Blah');
	};
	const signOut = wallet.signOut;
	wallet.signOut = () => {
		signOut.call(wallet);
		update('wallet.signedIn', false);
		update('', { account: null });
		update('app.tab', 1);
	};

	wallet.signedIn = wallet.isSignedIn();
    
	let account;
	if (wallet.signedIn) {
		account = wallet.account();
		wallet.balance = formatNearAmount((await wallet.account().getAccountBalance()).available, 4);
		await update('', { near, wallet, contractAccount, account });
	}

	await update('', { near, wallet, contractAccount, account });
};

export const updateWallet = () => async ({ update, getState }) => {
	const { wallet } = await getState();
	wallet.balance = formatNearAmount((await wallet.account().getAccountBalance()).available, 2);
	await update('', { wallet });
};


export const token2symbol = {
	"near": "NEAR",
	// "dai": "DAI",
	// "usdc": "USDC",
	// "usdt": "USDT",
};

const allTokens = Object.keys(token2symbol);

export const getTokenOptions = (value, setter, accepted = allTokens) => (
	<select value={value} onChange={(e) => setter(e.target.value)}>
		{
			accepted.map((value) => <option key={value} value={value}>{token2symbol[value]}</option>)
		}
	</select>);


export const handleOffer = async (account, token_id, offerToken, offerPrice) => {
	if (offerToken !== 'near') {
		return alert('currently only accepting NEAR offers');
	}
	if (offerToken === 'near') {
		await account.functionCall(marketId, 'offer', {
			nft_contract_id: contractId,
			token_id,
		}, GAS, parseNearAmount(offerPrice));
	} else {
		/// todo ft_transfer_call
	}
};