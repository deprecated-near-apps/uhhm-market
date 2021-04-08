use crate::*;

#[near_bindgen]
impl Contract {
    
    pub fn nft_supply_for_owner(
        &self,
        account_id: AccountId,
    ) -> U64 {
        U64(self.tokens_per_owner.get(&account_id).expect("No tokens for owner").len())
    }

    pub fn nft_tokens(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let keys = self.token_metadata_by_id.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    pub fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let tokens = self.tokens_per_owner.get(&account_id).expect("No tokens");
        let keys = tokens.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }
}
