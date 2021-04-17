use crate::*;

/// approval callbacks from NFT Contracts

trait NonFungibleTokenApprovalsReceiver {
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: AccountId,
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
        owner_id: AccountId,
        approval_id: U64,
        msg: String,
    ) {
        assert!(
            self.storage_deposits.contains(&owner_id),
            "Must call storage_deposit with {} to sell on this market.",
            STORAGE_AMOUNT
        );

        let nft_contract_id = env::predecessor_account_id();
        let sale_args: SaleArgs = near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");

        let SaleArgs {
            sale_conditions
        } = sale_args;

        let mut conditions = HashMap::new();

        for item in sale_conditions {
            let Price{
                price,
                ft_token_id,
            } = item;
            if !self.ft_token_ids.contains(&ft_token_id) {
                env::panic(format!("Token {} not supported by this market", ft_token_id).as_bytes());
            }
            if let Some(price) = price {
                // sale is denominated in FT
                conditions.insert(ft_token_id, price);
            } else {
                // accepting bids
                conditions.insert(ft_token_id, U128(0));
            }
        }
        
        // env::log(format!("add_sale for owner: {}", &owner_id).as_bytes());

        let bids = HashMap::new();

        let contract_and_token_id = format!("{}:{}", nft_contract_id, token_id);
        self.sales.insert(
            &contract_and_token_id,
            &Sale {
                owner_id: owner_id.clone(),
                approval_id,
                conditions,
                bids,
            },
        );

        // extra for views

        let mut by_owner_id = self.by_owner_id.get(&owner_id).unwrap_or_else(|| {
            UnorderedSet::new(hash_account_id(&owner_id, Some("by_owner_id".to_string())).try_to_vec().unwrap())
        });
        assert!(by_owner_id.len() <= MAX_SALES_PER_ACCOUNT.into(), "Only 20 active sales allowed on this market");
        by_owner_id.insert(&contract_and_token_id);
        self.by_owner_id.insert(&owner_id, &by_owner_id);

        let mut by_nft_contract_id = self.by_nft_contract_id.get(&nft_contract_id).unwrap_or_else(|| {
            UnorderedSet::new(hash_account_id(&nft_contract_id, Some("by_nft_contract_id".to_string())).try_to_vec().unwrap())
        });
        by_nft_contract_id.insert(&token_id);
        self.by_nft_contract_id.insert(&nft_contract_id, &by_nft_contract_id);
    }
}

