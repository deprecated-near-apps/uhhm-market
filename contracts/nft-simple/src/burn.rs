use crate::*;

/// CUSTOM - owner can burn a locked token for a given user, reducing the enumerable->nft_supply_for_type
#[near_bindgen]
impl Contract {
    #[payable]
    pub fn nft_burn(
        &mut self,
        token_id: Option<TokenId>,
    ) {
        let token = self.tokens_by_id.get(&token_id).expect("No token");
        assert_eq!(token.token_type.is_some(), true, "Token must have type");
        let token_type = token.token_type.unwrap();
        self.token_types_locked.get(&token_type).expect("Token must be locked");
        //TODO burn token
    }
}