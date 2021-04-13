import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	contractId,
	contractName,
	createGuestAccount,
	getContract,
} from '../utils/near-utils';

const {
	KeyPair,
} = nearAPI;

export const Contract = ({ near, update, account }) => {
	if (!account) return <p>Please connect your NEAR Wallet</p>;

	const [media, setMedia] = useState('');

	const handleMint = async () => {
		if (!media.length) {
			alert('Please enter some metadata');
			return;
		}
		update('loading', true);
		
		const metadata = { media };
		const deposit = parseNearAmount('0.1');
		await account.functionCall(contractId, 'nft_mint', {
			token_id: 'token-' + Date.now(),
			metadata,
		}, GAS, deposit);
		checkFreebies();
		update('loading', false);
		setMetadata('');
	};

	return <>
		<h3>Mint Something</h3>
		<input className="full-width" placeholder="Metadata (Image URL)" value={media} onChange={(e) => setMedia(e.target.value)} />
		<button onClick={() => handleMint()}>Mint</button>
	</>;
};

