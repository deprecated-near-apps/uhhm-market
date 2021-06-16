import React from 'react';
import NEAR from 'url:../img/near-logo.svg';
import Twitter from 'url:../img/twitter.svg';
import Discord from 'url:../img/discord.svg';

export const Footer = () => {
    return <footer>
        <p>Built on</p>
        <img src={NEAR} />
        <div className="social">
            <img src={Twitter} />
            <img src={Discord} />
        </div>
        <div className="tos">
            <span>Terms of Use</span>
            <span>Privacy Policy</span>
        </div>
    </footer>
};

