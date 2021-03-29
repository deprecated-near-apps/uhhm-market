use crate::*;

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SettlementArgs {
    pub approval_id: Option<64>,
    pub token_id: TokenId,
}

trait FungibleTokenReceiver {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128;
}

#[near_bindgen]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String
    ) -> U128 {
        let SettlementArgs {
            approval_id,
            token_id,
        } = near_sdk::serde_json::from_str(&msg).expect("Valid SettlementArgs");

        let Token {
            owner_id
        } = self.nft_token(token_id.clone());

        self.nft_transfer(
            sender_id,
            token_id: TokenId,
            Some(approval_id),
            None,
        );

        ext_ft_transfer::ft_transfer(
            beneficiary,
            sale.price, 
            None,
            &sale.ft_token_id,
            1,
            env::prepaid_gas() - GAS_FOR_FT_TRANSFER,
        );

        // assume all tokens sent here from marketplace contract is what is needed to be paid
        U128(amount)
    }
}

#[ext_contract(ext_ft_transfer)]
trait ExtTransfer {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}