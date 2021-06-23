import React, { useEffect, useState } from 'react';
import { handleFav } from '../state/favs';
import { Footer } from './Footer';
import { TokenSeries } from './TokenSeries';
import { TokenSale } from './TokenSale';
import anime from 'animejs/lib/anime.es.js';

import HeartOutline from 'url:../img/heart-outline.svg';
import Heart from 'url:../img/heart.svg';

const DBL_CLICK_WAIT = 300;
let clickTimeout;

export const Token = (props) => {

	const { app, update, dispatch, views, pathArgs } = props;

	const { isMobile } = app;
	const { tokens, sales, favs, salesByType } = views;
	const isToken = /token/.test(pathArgs[0]);
	const isSale = /sale/.test(pathArgs[0]);

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);

		// dataLayer.push({ 'event': 'pageview',     
		// 	'page_location': '/' + pathArgs.join('/'),
		// 	'page_title': 'Token: ' + (isToken ? 'series' : 'edition')
		// });
		
	}, []);

	const handleClick = (token_type) => {
		if (clickTimeout) {
			clearTimeout(clickTimeout);
			clickTimeout = null;
			// explode!
			if (!favs.includes(token_type)) {
				anime({
					targets: `#explode`,
					scale: 20,
					opacity: 0,
					duration: 500,
					easing: 'easeOutQuad',
					complete: () => {
						const el = document.querySelector(`#explode`);
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
			clearTimeout(clickTimeout);
			clickTimeout = null;
		}, DBL_CLICK_WAIT);
	};

	let token;
	if (isSale) {
		token = sales.find((t) => t.token_id === pathArgs[1]);
	} else {
		token = tokens.find((t) => t.token_type === pathArgs[1]);
	}

	if (!token || !mounted) return null;

	const {
		token_type,
		displayType,
		displayHowLongAgo,
		imageSrc,
		videoSrc,
		videoSrc2,
		videoSrc3,
	} = token;

	props = { ...props, token };

	return <section className="token">
		{
			isMobile &&
			<div className="content">
				<div className="heading">
					<h2>HipHopHead</h2>
					<h2>{displayType}</h2>
					<time>{salesByType[token_type]}/47 available</time>
				</div>
			</div>
		}
		<div className="media" onClick={() => handleClick(token_type)}>
			<div className="heart" onClick={(e) => {
				e.stopPropagation();
				dispatch(handleFav(token_type));
				return false;
			}}>
				<img src={favs.includes(token_type) ? Heart : HeartOutline} />
			</div>
			<div className="heart-explode">
				<img id={'explode'} src={Heart} />
			</div>
			<div className="video-wrap">
				<img crossOrigin="true" src={imageSrc} />
				<div className="lds-loader"><div></div><div></div><div></div></div>
				<video
					onClick={() => document.querySelector('video').play()}
					onLoadedData={() => {
						document.querySelector('.video-wrap .lds-loader').style.display = 'none';
						document.querySelector('.video-wrap img').style.display = 'none';
						document.querySelector('.video-wrap video').style.display = 'block';
					}}
					autoPlay={true} loop={true} preload="auto"
				>
					<source crossOrigin="anonymous" src={videoSrc} />
					<source crossOrigin="anonymous" src={videoSrc2} />
					<source crossOrigin="anonymous" src={videoSrc3} />
				</video>
			</div>
		</div>

		{isToken && <TokenSeries {...props} />}
		{isSale && <TokenSale {...props} />}

	</section>;
};

