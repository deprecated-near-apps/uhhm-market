use crate::*;

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn nft_mint(&mut self, token_id: TokenId, metadata: TokenMetadata, receiver_id: Option<ValidAccountId>) {
        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();
        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }
        
        // royalties (should equal 10000)
        let mut royalty = HashMap::new();
        royalty.insert(
            owner_id.clone(),
            SafeFraction::new(8000),
        );
        royalty.insert(
            "a1.testnet".to_string(),
            SafeFraction::new(500),
        );
        royalty.insert(
            "a2.testnet".to_string(),
            SafeFraction::new(250),
        );
        royalty.insert(
            "a3.testnet".to_string(),
            SafeFraction::new(250),
        );
        royalty.insert(
            "a4.testnet".to_string(),
            SafeFraction::new(250),
        );
        royalty.insert(
            "a5.testnet".to_string(),
            SafeFraction::new(250),
        );
        royalty.insert(
            "a6.testnet".to_string(),
            SafeFraction::new(250),
        );
        royalty.insert(
            "a7.testnet".to_string(),
            SafeFraction::new(250),
        );
        
        let token = Token {
            owner_id,
            approved_account_ids: Default::default(),
            next_approval_id: 0,
            royalty,
        };
        assert!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token already exists"
        );
        self.token_metadata_by_id.insert(&token_id, &metadata);
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        let new_token_size_in_bytes = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes =
            self.extra_storage_in_bytes_per_token + new_token_size_in_bytes;

        refund_deposit(required_storage_in_bytes);
    }
}
