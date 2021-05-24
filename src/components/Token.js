import React, { useEffect, useState } from 'react';
import * as nearAPI from 'near-api-js';
import { snackAttack } from '../state/app';
import { share } from '../utils/mobile';
import { explorerUrl, token2symbol, getTokenOptions, handleOffer } from '../state/near';

const {
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Token = ({
	dispatch, account, token, token: { token_id, nft_contract_id, metadata, owner_id, conditions, bids }
}) => {

	console.log(token);

	const [offerPrice, setOfferPrice] = useState('');
	const [offerToken, setOfferToken] = useState('near');

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => document.body.style.overflow = 'scroll';
	}, []);

	const handleShare = async (e) => {
		e.stopPropagation();
		e.preventDefault();
		const headers = new Headers({
			'max-age': '3600'
		});
		const path = `https://helper.nearapi.org/v1/contract/${nft_contract_id}/nft_token/`;
		const args = JSON.stringify({
			token_id
		});
		const actions = JSON.stringify({
			botMap: {
				'og:title': 'NFTs on NEAR',
				'og:description': 'Check out this NFT on NEAR!',
				'og:image': { field: 'metadata.media' }
			},
			redirect: encodeURIComponent(`${window.location.origin}${window.location.pathname}?t=${token_id}`),
			encodeUrl: true,
		});
		const url = path + args + '/' + actions;
		const response = await fetch(url, { headers }).then((res) => res.json());
		if (!response || !response.encodedUrl) {
			console.warn(response);
			return alert('Something went wrong trying to share this url, please try sharing from the address bar or use your browsers share feature');
		}
		const result = share(response.encodedUrl);
		if (!result.mobile) {
			dispatch(snackAttack('Link Copied!'));
		}
	};

	const { accountId } = account;

	return <div className="token">
		<div onClick={() => history.pushState({}, '', window.location.pathname)}>

			<h3>Click to Close</h3>
			<img src={metadata.media} />
		</div>
		<div className="token-detail">
			<div><a href={explorerUrl + '/accounts/' + owner_id}>{owner_id}</a></div>
			<br />
			<div><a href="#" onClick={(e) => handleShare(e)}>SHARE NOW</a></div>


			{
				conditions?.near.length && <>
					<h4>Sale Conditions</h4>
					{
						Object.entries(conditions).map(([ft_token_id, price]) => <div className="margin-bottom" key={ft_token_id}>
							{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]}
						</div>)
					}
					{
						accountId.length > 0 && accountId !== owner_id && <>
							<input type="number" placeholder="Price" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
							{
								getTokenOptions(offerToken, setOfferToken, Object.keys(conditions))
							}
							<button onClick={() => handleOffer(account, token_id, offerToken, offerPrice)}>Offer</button>
						</>
					}
				</>
			}

			{
				bids?.near && <>
					<h4>Offers</h4>
					{
						Object.entries(bids).map(([ft_token_id, { owner_id: bid_owner_id, price }]) => <div className="offers" key={ft_token_id}>
							<div>
								{price === '0' ? 'open' : formatNearAmount(price, 4)} - {token2symbol[ft_token_id]} by {bid_owner_id}
							</div>
							{
								accountId === owner_id &&
                                <button onClick={() => handleAcceptOffer(token_id, ft_token_id)}>Accept</button>
							}
						</div>)
					}
				</>
			}

		</div>

	</div>;
};

