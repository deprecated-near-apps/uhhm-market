import React, { useEffect } from 'react';
import { fungibleId } from '../utils/near-utils';
import { get } from '../utils/storage';
import { years } from '../utils/format';
import { ACCOUNT_SALES } from '../state/views';

export const MyBids = ({ account, views, dispatch }) => {
	if (!account) return null

	const { sales } = views
	const accountSales = get(ACCOUNT_SALES + account.accountId, [])

	const bids = sales.filter(({ token_id }) => accountSales.includes(token_id))

	return <>
		<section className="bids">
			<main>
				{
					bids.map((token, i) => {
						let {
							token_id,
							displayType,
							edition_id,
							imageSrc,
							bids,
						} = token;

						bids = bids[fungibleId] || [];
						const hasWinningBid = bids[0] && bids[0].owner_id === account?.accountId;
						const hasOutbid = !hasWinningBid && bids.some(({ owner_id }) => owner_id === account?.accountId);
					
						return <div className="bid" onClick={() => history.push('/sale/' + token_id)}>
							<img crossOrigin="true" src={imageSrc} />
							<div className="left">
								<p>HipHopHead {displayType}</p>
								<p>#{edition_id} {years(edition_id)}</p>
							</div>

							{
								hasOutbid && <div className="button red center text-white">
									<div>You were outbid!</div>
								</div>
							}
							{
								hasWinningBid && <div className="button green center text-white">
									<div>You have the winning bid!</div>
								</div>
							}


							{/* <div className="bids">
								<div>My Bid</div>
								<div>High</div>
							</div> */}
						</div>
					})
				}
			</main>
		</section>
	</>;

};

