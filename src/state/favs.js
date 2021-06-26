
import { get, set, del } from '../utils/storage';

export const FAV_KEY = '__FAV_KEY';

export const handleFav = (token_id) => async ({ update, dispatch }) => {
	const favs = get(FAV_KEY, []);
	const index = favs.indexOf(token_id);
	if (index > -1) {
		favs.splice(index, 1);
	} else {
		favs.push(token_id);
	}
	set(FAV_KEY, favs);
	update('views.favs', favs);
	if (favs.length === 0) {
		update('app.isFavOn', false);
	}
};

