import React, { useEffect, useState } from 'react';
import { fungibleId } from '../utils/near-utils';
import { BuyCredits } from './BuyCredits';
import { years } from '../utils/format';
import { loadSale } from '../state/views';
import { formatAmount } from '../utils/format';
import { handlePlaceBid } from '../state/actions';
import Menu from 'url:../img/menu-small.svg';
import Arrow from 'url:../img/arrow.svg';

export const TokenSale = (props) => {

	const { app, wallet, token, account, dispatch, views, update } = props;
	const { isMobile, timeLeft } = app;
	const { credits } = views;
	const { token_id, minBid, displayType } = token;

	useEffect(() => {
		dispatch(loadSale(token_id));
	}, []);

	const edition = token_id.split(':')[1];
	const bids = token.bids[fungibleId] || [];

	const hasWinningBid = bids[0] && bids[0].owner_id === account?.accountId;
	let topBidOwner = bids[0]?.owner_id;
	if (hasWinningBid) {
		topBidOwner = 'Your bid';
	}

	const hasOutbid = !hasWinningBid && bids.some(({ owner_id }) => owner_id === account?.accountId);

	/// TODO sort bids descending

	return <>
		<div className="content">

			{
				!isMobile && <div className="heading">
					<h2>HipHopHead</h2>
					<h2>{displayType}</h2>
					{/* <time>Minted: {displayHowLongAgo}</time> */}
				</div>
			}

			<div className="bids-type">
				<div>
					<div className="label">High</div>
					<div className="amount">${formatAmount(minBid)}</div>
				</div>
				<div className="ending">
					<p>Auction ends in:</p>
					<h2>{timeLeft}</h2>
				</div>
			</div>

			<button className="select edition"
				onClick={() => update('app.isEditionOpen', true)}
			>
				<div># {edition}</div>
				<div>{years(edition)}</div>
				<img src={Menu} />
			</button>

			{
				hasOutbid && <div className="button red center text-white">
					<div>You were outbid!</div>
				</div>
			}

			{
				hasWinningBid ?
					<div className="button green center text-white" onClick={() => {
						if (!/localhost/.test(window.location.href)) return;
						dispatch(handlePlaceBid(account, token, minBid));
					}}>
						<div>You have the winning bid!</div>
					</div>
					:
					account ?
						<button disabled={parseInt(credits) < parseInt(minBid)} onClick={() => dispatch(handlePlaceBid(account, token, minBid))}>
							<div>Place a Bid</div>
							<img src={Arrow} />
						</button>
						:
						<button onClick={() => update('app.isConnectOpen', true)}>Connect Wallet</button>

			}

			{account && credits &&
                <div className="center"><p>Credits: {formatAmount(credits)}</p></div>
			}

			{account && <BuyCredits />}

			<div className="bids">
				{
					!bids.length ? <p>No Bids!</p> :
						<>

							<h4>Latest Bids</h4>
							<div>
								{
									bids.map(({ owner_id, price }, i) => <div key={i}>
										<div>{i === 0 ? topBidOwner : owner_id}</div>
										<div>{formatAmount(price)}</div>
									</div>)
								}
							</div>
						</>
				}
			</div>
		</div>
	</>;
};

