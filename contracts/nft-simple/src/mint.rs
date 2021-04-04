use crate::*;

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn nft_mint(&mut self, token_id: TokenId, metadata: TokenMetadata) {
        let initial_storage_usage = env::storage_usage();
        
        // self.assert_owner();
        // royalties
        let owner_id = env::predecessor_account_id();
        let mut split_between = HashMap::new();
        split_between.insert(
            owner_id.clone(),
            SafeFraction::new(10000),
        );
        
        let token = Token {
            owner_id,
            approved_account_ids: Default::default(),
            next_approval_id: 0,
            royalty: Royalty {
                split_between,
                percentage: SafeFraction::new(10000),
            }
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
