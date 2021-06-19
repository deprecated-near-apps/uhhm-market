import React, { useEffect } from 'react';
import Close from 'url:../img/close.svg';
import { years } from '../utils/format';
import { formatAmount } from '../utils/format';

export const Edition = (props) => {

	const { update } = props;
	const { sales } = props.views;
	const { isMobile } = props.app;

	const token_type = props.pathArgs[1].split(':')[0];
	const list = Array(36).fill(37);
	const editions = sales.filter(({ token_type: tt }) => tt === token_type).sort((a, b) => b.edition_id - a.edition_id);

	return <section className="edition">
		{
			isMobile &&
				<header>
					<span>Select Edition</span>
					<img src={Close} onClick={() => update('app.isEditionOpen', false)} />
				</header>
				
		}
		<div onClick={() => update('app.isEditionOpen', false)} >
			<div>
				<div>
					{
						!isMobile && <div className="header">
							<span>Select Edition</span>
							<img src={Close} onClick={() => update('app.isEditionOpen', false)} />
						</div>
					}
					{
						list.map((total, i) => {
							const index = total - i;
							const edition = editions.find(({ edition_id }) => edition_id === index);

							if (edition) {
								const { token_id, edition_id, minBid } = edition;
								return <div className="available" key={edition_id} onClick={() => {
									history.push('/sale/' + token_id);
									update('app.isEditionOpen', false);
								}}>
									<div>#{edition_id}</div>
									<div>{years(edition_id)}</div>
									<div>${formatAmount(minBid)}</div>
								</div>;
							} else {
								return <div key={index} className="not-available">
									<div>#{index}</div>
									<div>{years(index)}</div>
									<div>Not Available</div>
								</div>;
							}
						})
					}
					<div className="not-available">
						<div>#1</div>
						<div>1973-1974</div>
						<div>Not Available</div>
					</div>
				</div>
			</div>
		</div>
	</section>;
};

