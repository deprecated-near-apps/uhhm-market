use crate::*;

/// approval callbacks from NFT Contracts

trait NonFungibleTokenApprovalsReceiver {
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: U64,
        msg: String,
    );
}

#[near_bindgen]
impl NonFungibleTokenApprovalsReceiver for Contract {
    /// where we add the sale because we know nft owner can only call nft_approve

    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: U64,
        msg: String,
    ) {
        let owner_paid_storage = self.storage_deposits.get(owner_id.as_ref()).unwrap_or(0);
        assert!(
            owner_paid_storage >= STORAGE_PER_SALE,
            "Required minimum storage to sell on market: {}",
            STORAGE_PER_SALE
        );

        let nft_contract_id = env::predecessor_account_id();
        let SaleArgs { sale_conditions } =
            near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");

        let mut conditions = HashMap::new();

        for Price { price, ft_token_id } in sale_conditions {
            if !self.ft_token_ids.contains(ft_token_id.as_ref()) {
                env::panic(
                    format!("Token {} not supported by this market", ft_token_id).as_bytes(),
                );
            }
            // sale is denominated in FT or 0 if accepting bids
            conditions.insert(ft_token_id.into(), price.unwrap_or(U128(0)));
        }

        // env::log(format!("add_sale for owner: {}", &owner_id).as_bytes());

        let bids = HashMap::new();

        let contract_and_token_id = format!("{}:{}", nft_contract_id, token_id);
        self.sales.insert(
            &contract_and_token_id,
            &Sale {
                owner_id: owner_id.clone().into(),
                approval_id,
                conditions,
                bids,
            },
        );

        // extra for views

        let mut by_owner_id = self.by_owner_id.get(owner_id.as_ref()).unwrap_or_else(|| {
            UnorderedSet::new(hash_account_id(owner_id.as_ref(), Some("o".to_string())))
        });

        let owner_occupied_storage = u128::from(by_owner_id.len()) * STORAGE_PER_SALE;
        assert!(
            owner_paid_storage > owner_occupied_storage,
            "User has more sales than storage paid"
        );
        by_owner_id.insert(&contract_and_token_id);
        self.by_owner_id.insert(owner_id.as_ref(), &by_owner_id);

        let mut by_nft_contract_id = self
            .by_nft_contract_id
            .get(&nft_contract_id)
            .unwrap_or_else(|| {
                UnorderedSet::new(hash_account_id(&nft_contract_id, Some("i".to_string())))
            });
        by_nft_contract_id.insert(&token_id);
        self.by_nft_contract_id
            .insert(&nft_contract_id, &by_nft_contract_id);
    }
}
