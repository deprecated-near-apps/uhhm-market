import React, { useEffect, useState } from 'react';
import { loadItems, loadCredits } from '../state/views';
import { Footer } from './Footer';

import Heart from 'url:../img/heart.svg';

// api-helper config
const domain = 'https://helper.nearapi.org';

export const Items = ({ app, views, update, account, dispatch }) => {

	const { tokens } = views

	let accountId = '';
	if (account) accountId = account.accountId;

	useEffect(() => {
		if (!tokens.length) return
	}, [tokens]);

	return <>
		<section className="gallery">
			<div>
				{
					tokens.map(({
						imageSrc,
						owner_id,
						token_id,
						isFav,
					}) => (
						<div key={token_id} className="item"
							onClick={() => history.push('/token/' + token_id + '/')}
						>
							<img crossOrigin="true" src={imageSrc} />
							{
								isFav &&
								<div className="heart">
									<img src={Heart} />
								</div>
							}
						</div>
					))
				}
			</div>
			<Footer />
		</section>
	</>;

};

