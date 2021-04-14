import React, { useEffect, useState } from 'react';
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

const token2symbol = {
	"near": "NEAR",
	"dai": "DAI",
	"usdc": "USDC",
	"usdt": "USDT",
};
const allTokens = Object.keys(token2symbol);

const getTokenOptions = (value, setter, accepted = allTokens) => (
	<select value={value} onChange={(e) => setter(e.target.value)}>
		{
			accepted.map((value) => <option key={value} value={value}>NEAR</option>)
		}
	</select>);

export const Gallery = ({ tab, contractAccount, account, loading }) => {
	if (!contractAccount) return null;

	let accountId = '';
	if (account) accountId = account.accountId;

	/// market
	const [sales, setSales] = useState([]);
	const [offerPrice, setOfferPrice] = useState('');
	const [offerToken, setOfferToken] = useState('near');

	/// updating user tokens
	const [tokens, setTokens] = useState([]);
	const [storage, setStorage] = useState(false);
	const [price, setPrice] = useState('0');
	const [token, setToken] = useState('near');
	const [saleConditions, setSaleConditions] = useState([]);

	useEffect(() => {
		if (!loading) loadItems();



	}, [loading]);

	const loadItems = async () => {
		if (accountId.length) {
			setStorage(await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: account.accountId }));
		}
		/// users tokens
		if (account) {
			const tokens = await contractAccount.viewFunction(contractId, 'nft_tokens_for_owner', {
				account_id: account.accountId,
				from_index: '0',
				limit: '20'
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
			setTokens(tokens);
		}

		/// all sales
		const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		});
		const tokens = await contractAccount.viewFunction(contractId, 'nft_tokens_batch', {
			token_ids: sales.filter(({ nft_contract_id }) => nft_contract_id === contractId).map(({ token_id }) => token_id)
		});
		// merge sale listing with nft token data
		for (let i = 0; i < sales.length; i++) {
			const { token_id } = sales[i];
			let token = tokens.find(({ token_id: t }) => t === token_id);
			// don't have it in batch, go find token data
			if (!token) {
				token = await contractAccount.viewFunction(contractId, 'nft_token', { token_id });
			}
			sales[i] = Object.assign(sales[i], token);
		}
		setSales(sales.filter(({owner_id}) => owner_id != accountId));
	};

	/// setters



	const handleOffer = async (token_id) => {
		if (offerToken !== 'near') {
			alert('currently only accepting NEAR offers');
		}
		if (offerToken === 'near') {
			await account.functionCall(marketId, 'offer', {
				nft_contract_id: contractId,
				token_id,
			}, GAS, parseNearAmount(offerPrice));
		} else {
			///todo ft_transfer_call
			
		}
		
	};


	const handleRegisterStorage = async () => {
		const storageMarket = await account.viewFunction(marketId, 'storage_amount', {}, GAS);
		await account.functionCall(marketId, 'storage_deposit', {}, GAS, storageMarket).catch(() => { });
	};

	const handleSaleUpdate = async (token_id) => {
		const sale = await contractAccount.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + ":" + token_id }).catch(() => { });
		if (sale) {
			await account.functionCall(marketId, 'remove_sale', {
				nft_contract_id: contractId,
				token_id,
			}, GAS);
		}
		await account.functionCall(contractId, 'nft_approve', {
			token_id,
			account_id: marketId,
			msg: JSON.stringify({ sale_conditions: saleConditions })
		}, GAS, parseNearAmount('0.01'));
		setPrice('0');
		setToken('near');
	};

	sales;

	return <>
		{
			tab === 1 && sales.map(({ metadata: { media }, owner_id, token_id, conditions = {}, bids = {} }) =>
				<div key={token_id} className="item">
					<img src={media} />
					<div className="line"></div>
					<p>Owned by {formatAccountId(owner_id)}</p>
					{
						Object.keys(conditions).length > 0 && <>
							<h4>Sale Conditions</h4>
							{
								Object.entries(conditions).map(([ft_token_id, price]) => <div className="margin-bottom" key={ft_token_id}>
									{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
								</div>)
							}
							<input type="number" placeholder="Price" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
							{
								getTokenOptions(offerToken, setOfferToken, Object.keys(conditions))
							}
							<button onClick={() => handleOffer(token_id)}>Offer</button>
						</>
					}
					{
						Object.keys(bids).length > 0 && <>
							<h4>Offers</h4>
							{
								Object.entries(bids).map(([ft_token_id, {owner_id, price}]) => <div className="offers" key={ft_token_id}>
									<div>
										{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
									</div>
									{ owner_id === accountId && <button>Remove</button>}
								</div>)
							}
						</>
					}
				</div>)
		}

		{
			tab === 2 && <>
				{!tokens.length && <p className="margin">No NFTs. Try minting something!</p>}
				{
					tokens.map(({ metadata: { media }, owner_id, token_id, conditions = {}, bids = {} }) =>
						<div key={token_id} className="item">
							<img src={media} />
							{
								storage ? <>
									{
										Object.keys(conditions).length > 0 && <>
											<h4>Current Sale Conditions</h4>
											{
												Object.entries(conditions).map(([ft_token_id, price]) => <div className="margin-bottom" key={ft_token_id}>
													{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
												</div>)
											}
										</>
									}
									{
										saleConditions.length > 0 &&
										<div>
											<h4>Pending Sale Updates</h4>
											{
												saleConditions.map(({ price, ft_token_id }) => <div className="margin-bottom" key={ft_token_id}>
													{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
												</div>)
											}
											<button onClick={() => handleSaleUpdate(token_id)}>Update Sale Conditions</button>
										</div>
									}
									{
										accountId === owner_id && <>
											<div>
												<input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
												{
													getTokenOptions(token, setToken)
												}
												<button onClick={() => setSaleConditions(saleConditions
													.filter(({ ft_token_id }) => ft_token_id !== token)
													.concat([{
														price: parseNearAmount(price),
														ft_token_id: token,
													}]))}>Add</button>
											</div>
											<div>
												<i style={{fontSize: '0.75rem'}}>Note: price 0 means open offers</i>
											</div>
										</>
									}
									{
										Object.keys(bids).length > 0 && <>
											<h4>Offers</h4>
											{
												Object.entries(bids).map(([ft_token_id, {owner_id, price}]) => <div className="offers" key={ft_token_id}>
													<div>
														{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
													</div>
													<button>Accept</button>
												</div>)
											}
										</>
									}
								</>
									:
									<div className="center">
										<button onClick={() => handleRegisterStorage()}>Register with Market to Sell</button>
									</div>
							}

						</div>)
				}
			</>
		}

	</>;
};

