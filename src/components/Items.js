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

	const handleClick = (token_type) => {
		if (clickTimeout) {
			clearTimeout(clickTimeout)
			clickTimeout = null
			dispatch(handleFav(token_type))
			return
		}
		clickTimeout = setTimeout(() => history.push('/token/' + token_type + '/'), DBL_CLICK_WAIT)
	}

	let items = tokens
	if (isFavOn && favs.length > 0) {
		items = tokens.filter(({ token_type }) => favs.includes(token_type))
	}

	return <>
		<section className="items">
			<div>
				{
					items.map(({
						imageSrc,
						token_type,
					}) => (
						<div key={token_type} className="item" onClick={() => handleClick(token_type)}>
							<img crossOrigin="true" src={imageSrc} />
							{
								favs.includes(token_type) &&
								<div className="heart" onClick={(e) => {
									e.stopPropagation();
									dispatch(handleFav(token_type))
									return false;
								}}>
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

