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
    #[payable]
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: U64,
        msg: String,
    ) {
        let nft_contract: AccountId = env::predecessor_account_id();
        let sale_args: SaleArgs = near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");
        self.add_sale(
            ValidAccountId::try_from(nft_contract).unwrap(),
            token_id,
            owner_id,
            approval_id,
            sale_args,
        );
    }
}
