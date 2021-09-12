import React, { useEffect } from 'react';
import { handleFav } from '../state/favs';
import Heart from 'url:../img/heart.svg';
import HeartOutline from 'url:../img/heart-outline.svg';
import Flame from 'url:../img/flame.svg';
import anime from 'animejs/lib/anime.es.js';

const DBL_CLICK_WAIT = 300;
let clickTimeout;

export const Items = ({ app, views, dispatch }) => {

	const { isFavOn, isHotOn, timeLeft, isMobile } = app;
	const { tokens, favs, allBidsByType, sales } = views;

	useEffect(() => {
		clearTimeout(clickTimeout);
		clickTimeout = null;
	}, []);

	const handleClick = (token_type, index) => {

		if (clickTimeout) {
			clearTimeout(clickTimeout);
			clickTimeout = null;
			// explode!
			if (!favs.includes(token_type)) {
				anime({
					targets: `#explode-` + index,
					scale: isMobile ? 8 : 25,
					opacity: 0,
					duration: 500,
					easing: 'easeOutQuad',
					complete: () => {
						const el = document.querySelector(`#explode-` + index);
						if (!el) return;
						el.style.transform = 'scale(0)';
						el.style.opacity = 1;
					}
				});
			}
			dispatch(handleFav(token_type));
			return;
		}
		clickTimeout = setTimeout(() => {
			history.push('/token/' + token_type + '/')
		}, DBL_CLICK_WAIT);
	};

	let items = tokens.slice();
	if (isFavOn && favs.length > 0) {
		items = tokens.filter(({ token_type }) => favs.includes(token_type));
	}

	const hot = Object.entries(allBidsByType).map(([k, v]) => ({
		type: k,
		bids: v
	})).filter(({ bids }) => bids.length > 1).sort((a, b) => b.bids.length - a.bids.length)

	if (isHotOn && hot.length > 0) {
		items = []
		let bidMax = 0
		hot.forEach((token) => {
			if (token.bids.length > bidMax) {
				bidMax = token.bids.length
			}
			const item = tokens.find(({ token_type }) => token_type === token.type)
			if (item) {
				items.push(item)
			}
		})
		hot.forEach((token) => {
			token.bidIconNum = Math.floor(token.bids.length / bidMax * 3)
		})
	}

	if (items[0]) console.log(items[0].imageSrc)

	return <>
		<section className="items">

			<h1>A Love Letter to <span className="red-text">Hip Hop</span></h1>

			<p>
				To understand what's going on here and how to get involved, check out <a onClick={() => history.push('/about')}>About</a> and <a onClick={() => history.push('/how')}>How It Works</a>
			</p>
			<p>
				Auction ends in
			</p>
			<p className="ending">{timeLeft}</p>
			<p className="pieces">{isFavOn ? 'Favorites' : '103 Pieces'}</p>
			<div className="bg"></div>
			<main>
				{
					items.map(({
						imageSrc,
						token_type,
					}, i) => (
						<div key={token_type} className="item" onClick={() => handleClick(token_type, i)}>
							<img crossOrigin="true" src={imageSrc} />
							{
								favs.includes(token_type) ?
									<div className="heart" onClick={(e) => {
										e.stopPropagation();
										dispatch(handleFav(token_type));
										return false;
									}}>
										<img src={Heart} />
									</div>
									:
									<div className="heart-outline" onClick={(e) => {
										e.stopPropagation();
										dispatch(handleFav(token_type));
										return false;
									}}>
										<img src={HeartOutline} />
									</div>
							}
							{
								isHotOn && <div className="flame">
									{
										new Array(hot[i].bidIconNum).fill(0).map((_, i) => {
											return <img key={i} src={Flame} />
										})
									}
								</div>
							}
							<div className="heart-explode">
								<img id={'explode-' + i} src={Heart} />
							</div>
						</div>
					))
				}
			</main>
		</section>
	</>;

};

