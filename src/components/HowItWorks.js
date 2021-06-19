import React from "react";

export const HowItWorks = (props) => {
	const { app: { isMobile } } = props

	return <>
		<section className="page">

			<h1>How to bid on <span className="red">Hip Hop Heads</span></h1>
			<p className="number"><span>1.</span> Choose your favorite Hip Hop Head NFT</p>
			<p>
				A new edition of each Hip Hop Head will be released each day for the 36 days the auction is live.
			</p>
			<p>
				Each edition represents a year in hip-hop history. Explore the NFTs in the Collection tab, choose your favorite Head, and get ready to bid!
			</p>

			<p className="number"><span>2.</span> Claim a NEAR wallet</p>
			<p>
				When you’re ready to place a bid, claim a NEAR wallet (with a human-readable address unique to you, like a username). 
			</p>
			<p>
				Connect your wallet to the marketplace application. If you win an auction, this will allow your NFT to display in your NEAR wallet.
			</p>

			<p className="number"><span>3.</span> Buy some credits</p>
			<p>
				Buyers will bid on NFTs using marketplace credits. You can purchase these with a credit card right on the site: no cryptocurrency needed, no complex onboarding through an exchange.
			</p>
			<p>
				Make sure to purchase enough credits to cover your bid, then try your luck!
			</p>

			<p className="number"><span>4.</span> Bid and watch</p>
			<p>
				Each bid will start with a reserve price. The current bid is bonded with the item until it is outbid or the auction closes.			
			</p>
			<p>
				Place bids using your credits. Each bid you submit must be higher than the current high bid for each edition, and you must have sufficient credits to cover the amount you choose to bid.
			</p>
			<p>
				If you are outbid, the credits will be returned to you immediately and you can use them to bid again. You may need to purchase more credits to submit a higher bid. When you purchase more credits, your bidding allowance will go up. You can make as many credit purchases as you wish to add to your available credits.
			</p>
			<p>
				Credits can be used on any edition throughout the auction as long as they are not bonded to a currently winning NFT bid.
			</p>

			<p className="number"><span>5.</span> Receive winning NFT or refunded credits</p>
			<p>
				On Day 37 (noon EDT), bidding will conclude and winners will receive their Hip Hop Head NFTs in their NEAR wallet. 
			</p>
			<p>
				Any credits purchased for non-winning bids will be refunded to the bidder’s credit card. 
			</p>
			
		</section >
	</>;

}