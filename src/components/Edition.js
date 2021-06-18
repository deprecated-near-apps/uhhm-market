import React from 'react';
import Close from 'url:../img/close.svg';
import { years } from '../utils/format';
import { formatAmount } from '../utils/format';

export const Edition = (props) => {

	const { update } = props;
	const { sales } = props.views;
	const { isMobile } = props.app;

	const token_type = props.pathArgs[1].split(':')[0];

	const editions = sales.filter(({ token_type: tt }) => tt === token_type).sort((a, b) => a.edition_id - b.edition_id);
	const rest = Array(36 - editions.length).fill(editions.length + 2);

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

				<div className="not-available">
					<div>#1</div>
					<div>1973-1974</div>
					<div>Not Available</div>
				</div>
				{
					editions.map(({ token_id, edition_id, minBid }) => <div className="available" key={edition_id} onClick={() => {
						history.push('/sale/' + token_id);
						update('app.isEditionOpen', false);
					}}>
						<div>#{edition_id}</div>
						<div>{years(edition_id)}</div>
						<div>{formatAmount(minBid)}</div>
					</div>)
				}
				{
					rest.map((l, i) => {
						const index = l + i;
						return <div key={index} className="not-available">
							<div>#{index}</div>
							<div>{years(index)}</div>
							<div>Not Available</div>
						</div>;
					})
				}
			</div>
			</div>
		</div>
	</section>;
};

