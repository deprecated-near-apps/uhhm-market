import React, { useEffect, useState } from 'react';
import { contractId, marketId, fungibleId } from '../utils/near-utils'
import { BuyCredits } from './BuyCredits';
import { years } from '../utils/format';
import { loadCredits } from '../state/views';
import { formatAmount } from '../utils/format';
import { handlePlaceBid } from '../state/actions';
import Menu from 'url:../img/menu-small.svg';
import Arrow from 'url:../img/arrow.svg';

export const TokenSale = (props) => {

    const { views, token, account, update, dispatch } = props
    const { credits, sales } = views
    const { token_id, token_type, sale_conditions } = token

    const minBid = Math.max(parseInt(Object.values(sale_conditions)[0], 10), parseInt((token.bids[fungibleId] || [])[0]?.price || '0', 10))


    const edition = token_id.split(':')[1]
    const bids = token.bids[fungibleId] || []

    /// TODO sort bids descending

    return <>
        <div className="content">
            <div className="bids-type">
                <div>
                    <div className="label">High</div>
                    <div className="amount">${formatAmount(minBid)}</div>
                </div>
                <div className="ending">
                    <p>Auction ends in:</p>
                    <h2>42 : 13 : 05</h2>
                </div>
            </div>

            <div className="select edition"
                onClick={() => history.push('/edition/' + token_type)}
            >
                <div># {edition}</div>
                <div>{years(edition)}</div>
                <img src={Menu} />
            </div>

            <div className="button"
                onClick={() => dispatch(handlePlaceBid(account, token, minBid))}
            >
                <div>Place a Bid</div>
                <img src={Arrow} />
            </div>

            <BuyCredits />

            <div className="bids">
                {
                    !bids.length ? <p>No Bids!</p> :
                        <>

                            <h4>Latest Bids</h4>
                            <div>
                                {
                                    bids.map(({ owner_id, price }) => <div>
                                        <div>{owner_id}</div>
                                        <div>{formatAmount(price)}</div>
                                    </div>)
                                }
                            </div>
                        </>
                }
            </div>
        </div>
    </>
};

