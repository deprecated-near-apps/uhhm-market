import React, { useEffect, useState } from 'react';
import * as nearAPI from 'near-api-js';
import { Footer } from './Footer';
import { TokenSeries } from './TokenSeries';
import { TokenSale } from './TokenSale';
import { loadItems } from '../state/views';

const {
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Token = (props) => {

	const { app, update, dispatch, views, pathArgs } = props

	const { isMobile } = app
	const { tokens } = views
	const isToken = /token/.test(pathArgs[0])
	const isSale = /sale/.test(pathArgs[0])

	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, []);

	const token = tokens.find((t) => t.token_id === pathArgs[1])

	if (!token || !mounted) return null

	const {
		displayType,
		displayHowLongAgo,
		imageSrc,
		videoSrc,
		videoSrc2,
		videoSrc3,
	} = token

	props = { ...props, token }

	return <section className="token">
		{
			isMobile &&
			<div className="content">
				<div className="heading">
					<h2>HipHopHead</h2>
					<h2>{displayType}</h2>
					<time>Minted: {displayHowLongAgo}</time>
				</div>
			</div>
		}
		<div className="media">
			{
				/localhost/.test(window.location.href) ?
					<img crossOrigin="true" src={imageSrc} />
					:
					<video
						onPlay={() => document.querySelector('.lds-loader').style.display = 'none'}
						autoPlay={true} loop={true} preload="auto"
					>
						<source crossOrigin="anonymous" src={videoSrc} />
						<source crossOrigin="anonymous" src={videoSrc2} />
						<source crossOrigin="anonymous" src={videoSrc3} />
					</video>
			}
		</div>
		{
			!isMobile && <div className="content">
				<div className="heading">
					<h2>HipHopHead</h2>
					<h2>{displayType}</h2>
					<time>Minted: {displayHowLongAgo}</time>
				</div>
			</div>
		}

		{isToken && <TokenSeries {...props} />}
		{isSale && <TokenSale {...props} />}

		<Footer />
	</section>
};

