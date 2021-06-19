import React, { useEffect } from 'react';
import { handleFav } from '../state/favs';
import Heart from 'url:../img/heart.svg';
import HeartOutline from 'url:../img/heart-outline.svg';
import anime from 'animejs/lib/anime.es.js';

const DBL_CLICK_WAIT = 300;
let clickTimeout;

export const Items = ({ app, views, dispatch }) => {

	const { isFavOn, timeLeft, isMobile } = app;
	const { tokens, favs } = views;

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
		clickTimeout = setTimeout(() => history.push('/token/' + token_type + '/'), DBL_CLICK_WAIT);
	};

	let items = tokens;
	if (isFavOn && favs.length > 0) {
		items = tokens.filter(({ token_type }) => favs.includes(token_type));
	}

	return <>
		<section className="items">

			<h1>A Love Letter to <span className="red-text">Hip Hop</span></h1>

			<p>
				To understand what's going on here and how to get involved, check out <a href="" onClick={() => history.push('/about')}>About</a> and <a href="" onClick={() => history.push('/how')}>How It Works</a>
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

