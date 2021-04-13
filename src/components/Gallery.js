import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { get, set, del } from '../utils/storage';
import { GAS, parseNearAmount } from '../state/near';
import { 
	marketId,
	contractId,
	formatAccountId,
} from '../utils/near-utils';

const ADD_SALE = '__ADD_SALE';

const {
	KeyPair,
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Gallery = ({ contractAccount, loading }) => {
	if (!contractAccount) return null;

	const [tokens, setTokens] = useState([]);
	const [sales, setSales] = useState([]);
	const [amount, setAmount] = useState('');
	const [filter, setFilter] = useState(1);

	useEffect(() => {
		if (!loading) loadItems();
	}, [loading]);

	const loadItems = async () => {
		const tokens = await contractAccount.viewFunction(contractId, 'nft_tokens', {
			from_index: '0',
			limit: '20'
		})
		setTokens(tokens);

		const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		})
		// merge sale listing with nft token data
		for (let i = 0; i < sales.length; i++) {
			const { token_id } = sales[i];
			let token = tokens.find(({ token_id: t }) => t === token_id);
			// don't have it in state, go find token data
			if (!token) {
				token = await contractAccount.viewFunction(contractId, 'nft_token', { token_id })
			}
			sales[i] = Object.assign(sales[i], token)
		}
		setSales(sales);
	};

	return <>
		<div className="filters">
			<button onClick={() => setFilter(1)} style={{ background: filter === 1 ? '#FFB259' : ''}}>All NFTs</button>
			<button onClick={() => setFilter(2)} style={{ background: filter === 2 ? '#FFB259' : ''}}>For Sale</button>
		</div>

		{
			filter === 1 && tokens.map(({ metadata: { media }, owner_id, sales, token_id }) => 
			<div key={token_id} className="item">
				<img src={media} />
				<div className="line"></div>
				<p>Owned by {formatAccountId(owner_id)}</p>
				
				<input placeholder="Price (N)" value={amount} onChange={(e) => setAmount(e.target.value)} />
				<button onClick={() => handleSetPrice(token_id)}>Set a Price</button>
			</div>)
		}

		{
			filter === 2 && sales.map(({ metadata: { media }, owner_id, sales, token_id }) => 
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

