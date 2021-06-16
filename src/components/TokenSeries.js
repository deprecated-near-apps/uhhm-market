import React, { useEffect, useState } from 'react';
import { formatAmount } from '../utils/format';
import Menu from 'url:../img/menu-small.svg';

export const TokenSeries = (props) => {

    const { app, token, update, views } = props
	const { isMobile, timeLeft } = app
    const { sales, allBidsByType } = views
    const { token_type, displayType, displayHowLongAgo } = token

    const allBids = allBidsByType[token_type]

    return <>
        <div className="content">

            {
                !isMobile && <div className="heading ">
                    <h2>HipHopHead</h2>
                    <h2>{displayType}</h2>
                    <time>Minted: {displayHowLongAgo}</time>
                </div>
            }
            
            <div className="bids-type">
                <div>
                    <div className="label">Low</div>
                    <div className="amount">${formatAmount(allBids[allBids.length-1].price)}</div>
                </div>
                <div>
                    <div className="label">High</div>
                    <div className="amount">${formatAmount(allBids[0].price)}</div>
                </div>
            </div>
            <div className="description">
                <h4>36/47 editions available</h4>
                <p>Each edition corresponds to a specific year in the hip-hop industry and is an independent NFT with their own bids. Thus, Edition #1 corresponds to the period from 1973 to 1974, Edition #2 to the period from 1974 to 1975, and so on till 2021.</p>
            </div>
            <div className="ending">
                <p>Auction ends in:</p>
                <h2>{ timeLeft }</h2>
            </div>
            <div className="select"
                onClick={() => update('app.isEditionOpen', true)}
            >
                <div>Select Edition</div>
                <img src={Menu} />
            </div>
        </div>
    </>
};

