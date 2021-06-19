import React from 'react';
import NEAR from 'url:../img/near-logo.svg';
import Twitter from 'url:../img/twitter.svg';
import Discord from 'url:../img/discord.svg';

export const Footer = ({ isMobile }) => {
	return <footer>
		{
			isMobile ?
				<>
					<p>Built on</p>
					<a href="https://near.org" target="_blank"><img src={NEAR} /></a>
					<div className="social">
						<a href="https://twitter.com/NEARProtocol" target="_blank"><img src={Twitter} /></a>
						<a href="https://near.chat" target="_blank"><img src={Discord} /></a>
					</div>
					<div className="tos">
						<span onClick={() => history.push('/tos')}>Terms of Use</span>
						<span>Privacy Policy</span>
					</div>
				</>
				:
				<>
					<div className="tos">
						<span onClick={() => history.push('/tos')}>Terms of Use</span>
						<span>Privacy Policy</span>
					</div>
					<div className="built-on">
						<p>Built on</p>
						<a href="https://near.org" target="_blank"><img src={NEAR} /></a>
					</div>
					<div className="social">
						<a href="https://twitter.com/NEARProtocol" target="_blank"><img src={Twitter} /></a>
						<a href="https://near.chat" target="_blank"><img src={Discord} /></a>
					</div>

				</>
		}
	</footer>;
};

