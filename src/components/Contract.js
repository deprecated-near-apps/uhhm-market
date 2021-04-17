import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	contractId,
	isAccountTaken,
	networkId,
} from '../utils/near-utils';

const {
	KeyPair,
} = nearAPI;

export const Contract = ({ near, update, account }) => {
	if (!account) return <p>Please connect your NEAR Wallet</p>;

	const [media, setMedia] = useState('');
	const [validMedia, setValidMedia] = useState('');
	const [royalties, setRoyalties] = useState({});
	const [royalty, setRoyalty] = useState([]);
	const [receiver, setReceiver] = useState([]);

	const handleMint = async () => {
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
		
		update('loading', true);
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
		checkFreebies();
		update('loading', false);
		setMetadata('');
	};

	return <>
		<h4>Mint Something</h4>
		<input className="full-width" placeholder="Image Link" value={media} onChange={(e) => setMedia(e.target.value)} />
		<img src={media} onLoad={() => setValidMedia(true)} onError={() => setValidMedia(false)} />
		
		{ !validMedia && <p>Image link is invalid.</p> }
		
		<h4>Royalties</h4>
		{
			Object.keys(royalties).length > 0 ? 
				Object.entries(royalties).map(([receiver, royalty]) => <div key={receiver}>
					{receiver} - {royalty} % <button onClick={() => {
						delete royalties[receiver];
						setRoyalties(Object.assign({}, royalties));
					}}>❌</button>
				</div>)
				:
				<p>No royalties added yet.</p>
		}
		<input className="full-width" placeholder="Account ID" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
		<input type="number" className="full-width" placeholder="Percentage" value={royalty} onChange={(e) => setRoyalty(e.target.value)} />
		<button onClick={async () => {
			const exists = await isAccountTaken(receiver);
			if (!exists) return alert(`Account: ${receiver} does not exist on ${networkId ==='default' ? 'testnet' : 'mainnet'}.`);
			setRoyalties(Object.assign({}, royalties, {
				[receiver]: royalty
			}));
		}}>Add Royalty</button>

		<div className="line"></div>

		<button onClick={() => handleMint()}>Mint</button>
	</>;
};

