import React, { useEffect, useState } from 'react';
import { handleFav } from '../state/favs';
import { Footer } from './Footer';
import Heart from 'url:../img/heart.svg';

const DBL_CLICK_WAIT = 300;
let clickTimeout

export const Items = ({ app, views, account, dispatch }) => {

	const { isFavOn } = app
	const { tokens, favs } = views

	useEffect(() => {
		clearTimeout(clickTimeout)
		clickTimeout = null
	}, []);

	const handleClick = (token_id) => {
		if (clickTimeout) {
			clearTimeout(clickTimeout)
			clickTimeout = null
			dispatch(handleFav(token_id))
			return
		}
		clickTimeout = setTimeout(() => history.push('/token/' + token_id + '/'), DBL_CLICK_WAIT)
	}

	let items = tokens
	if (isFavOn && favs.length > 0) {
		items = tokens.filter(({ token_id }) => favs.includes(token_id))
	}

	return <>
		<section className="items">
			<div>
				{
					items.map(({
						imageSrc,
						token_id,
					}) => (
						<div key={token_id} className="item" onClick={() => handleClick(token_id)}>
							<img crossOrigin="true" src={imageSrc} />
							{
								favs.includes(token_id) &&
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

