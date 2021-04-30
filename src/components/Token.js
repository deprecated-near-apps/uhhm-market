import React, { Component, useEffect, useState } from 'react';
import { explorerUrl } from '../state/near'
import { snackAttack } from '../state/app'
import { share } from '../utils/mobile'


export const Token = ({
	dispatch, token: { token_id, nft_contract_id, metadata, owner_id }
}) => {

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => document.body.style.overflow = 'scroll'
    }, []);
    
    const handleShare = async (e) => {
        e.stopPropagation()
        e.preventDefault()
        const headers = new Headers({
            'max-age': '3600'
        })
        const path = `https://helper.nearapi.org/v1/contract/${nft_contract_id}/nft_token/`
        const args = JSON.stringify({
            token_id
        });
        const actions = JSON.stringify({
            botMap: {
                'og:title': 'NFTs on NEAR',
                'og:description': 'Check out this NFT on NEAR!',
                'og:image': { field: 'metadata.media' }
            },
            redirect: encodeURIComponent(`${window.location.origin}${window.location.pathname}?t=${token_id}`),
            encodeUrl: true,
        });
        const url = path + args + '/' + actions;
        const response = await fetch(url, { headers }).then((res) => res.json());
        if (!response || !response.encodedUrl) {
            console.warn(response)
            return alert('Something went wrong trying to share this url, please try sharing from the address bar or use your browsers share feature')
        }
        const result = share(response.encodedUrl)
        if (!result.mobile) {
            dispatch(snackAttack('Link Copied!'))
        }
    }

    return <div className="token" onClick={() => history.pushState({}, '', window.location.pathname)}>
		<div>
            <h3>Click to Close</h3>
            <img src={metadata.media} />
            <div className="token-detail">
                <div><a href={explorerUrl + '/accounts/' + nft_contract_id}>{token_id}</a></div>
                <div>Owner</div>
                <div><a href={explorerUrl + '/accounts/' + owner_id}>{owner_id}</a></div>
                <br />
                <div><a href="#" onClick={(e) => handleShare(e)}>SHARE NOW</a></div>
                <br />
                <div className="time">Minted ??? ago</div>
            </div>
        </div>
    </div>
}

