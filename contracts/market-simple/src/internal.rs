use crate::*;
use near_sdk::CryptoHash;

// pub(crate) fn assert_one_yocto() {
//     assert_eq!(
//         env::attached_deposit(),
//         1,
//         "Requires attached deposit of exactly 1 yoctoNEAR"
//     )
// }

pub(crate) fn hash_account_id(account_id: &AccountId, modifier: Option<String>) -> Vec<u8> {
    let mut str = account_id.clone();
    let mut prefix = Vec::with_capacity(33);
    if let Some(modifier) = modifier {
        prefix.extend(modifier.into_bytes());
    }
    prefix.extend(env::sha256(str.as_bytes()));
    prefix
}

impl Contract {
    pub(crate) fn assert_owner(&self) {
        assert_eq!(
            &env::predecessor_account_id(),
            &self.owner_id,
            "Owner's method"
        );
    }

    pub(crate) fn internal_remove_sale(
        &mut self,
        nft_contract_id: AccountId,
        token_id: TokenId,
    ) -> Sale {
        let contract_and_token_id = format!("{}:{}", &nft_contract_id, token_id);
        let sale = self.sales.remove(&contract_and_token_id).expect("No sale");

        let mut by_owner_id = self.by_owner_id.get(&sale.owner_id).expect("No sale");
        by_owner_id.remove(&contract_and_token_id);
        if by_owner_id.is_empty() {
            self.by_owner_id.remove(&sale.owner_id);
        } else {
            self.by_owner_id.insert(&sale.owner_id, &by_owner_id);
        }

        let mut by_nft_contract_id = self
            .by_nft_contract_id
            .get(&nft_contract_id)
            .expect("No sale");
        by_nft_contract_id.remove(&token_id);
        if by_nft_contract_id.is_empty() {
            self.by_nft_contract_id.remove(&nft_contract_id);
        } else {
            self.by_nft_contract_id
                .insert(&nft_contract_id, &by_nft_contract_id);
        }

        sale
    }
}
