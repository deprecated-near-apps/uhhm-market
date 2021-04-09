use crate::*;

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn nft_mint(
        &mut self,
        token_id: TokenId,
        metadata: TokenMetadata,
        royalties: Option<HashMap<AccountId, u32>>,
        receiver_id: Option<ValidAccountId>,
    ) {
        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();
        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }
        
        // royalties (should equal 10000)
        let mut royalty = HashMap::new();
        // nft contract owner gets 5%
        royalty.insert(self.owner_id.clone(), 500);
        // user royalties arg?
        if let Some(royalties) = royalties {
            let sum: u32 = royalties.values().map(|a| *a).reduce(|a, b| a + b).unwrap();
            assert_eq!(sum, 10000, "Royalties should sum to exactly 10000");
            assert!(royalties.len() < 7, "Cannot add more than 6 royalty amounts");
            for (account, mut amount) in royalties {
                if account == owner_id {
                    amount -= 500;
                }
                royalty.insert(account, amount);
            }
        } else {
            // owner gets rest of royalties if no royalties arg
            royalty.insert(owner_id.clone(), 9500);
        }

        env::log(format!("minting token with royalties: {:?}", royalty).as_bytes());
        
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