use crate::*;

/// callbacks from FT Contracts

trait FungibleTokenReceiver {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> Promise;
}

#[near_bindgen]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> Promise {
        let PurchaseArgs {
            nft_contract_id,
            token_id,
        } = near_sdk::serde_json::from_str(&msg).expect("Invalid SaleArgs");
        
        let contract_and_token_id = format!("{}:{}", nft_contract_id, token_id);
        let sale = self.sales.get(&contract_and_token_id).expect("No sale in ft_on_transfer");
        assert_ne!(sale.owner_id, sender_id, "Cannot bid on your own sale.");
        let ft_token_id = env::predecessor_account_id();
        let price = *sale.conditions.get(&ft_token_id).expect("Not for sale in that token type");

        assert_eq!(u128::from(amount), u128::from(price), "Must pay exactly the sale price");

        self.process_purchase(nft_contract_id, token_id, ft_token_id, price, sender_id)
    }
}