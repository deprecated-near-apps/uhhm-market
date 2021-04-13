import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { get, set, del } from '../utils/storage';
import { GAS, parseNearAmount } from '../state/near';
import { 
	marketId,
	contractId,
	marketId,
	formatAccountId,
	createGuestAccount,
	marketDeposit,
} from '../utils/near-utils';

const ADD_SALE = '__ADD_SALE';

const {
	KeyPair,
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Gallery = ({ near, signedIn, contractAccount, account, localKeys, loading, update }) => {
	if (!contractAccount) return null;

	const [fetching, setFetching] = useState(false);
	const [tokens, setTokens] = useState([]);
	const [sales, setSales] = useState([]);
	const [amount, setAmount] = useState('');
	const [filter, setFilter] = useState(1);

	useEffect(() => {
		if (!fetching && !loading) loadItems();
	}, [loading]);

	const loadItems = async () => {
		setFetching(true);
		setTokens(await contractAccount.viewFunction(contractId, 'nft_tokens', {
			from_index: '0',
			limit: '20'
		}));
		getSales(await contractAccount.viewFunction(marketId, 'get_sales', {
			from_index: '0',
			limit: '20'
		}));
	};



	return <>
		<div className="filters">
			<button onClick={() => setFilter(1)} style={{ background: filter === 1 ? '#FFB259' : ''}}>All NFTs</button>
			<button onClick={() => setFilter(2)} style={{ background: filter === 2 ? '#FFB259' : ''}}>For Sale</button>
		</div>
		{
			tokens.map(({ metadata: { media }, owner_id, sales, token_id }) => 
			<div key={token_id} className="item">
				<img src={media} />
				<div className="line"></div>
				<p>Owned by {formatAccountId(owner_id)}</p>
				
				<input placeholder="Price (N)" value={amount} onChange={(e) => setAmount(e.target.value)} />
				<button onClick={() => handleSetPrice(token_id)}>Set a Price</button>
			</div>)
		}
	</>;
};

