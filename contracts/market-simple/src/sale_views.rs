use crate::*;

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleJson {
    pub nft_contract_id: AccountId,
    pub token_id: TokenId,
    pub token_type: TokenType,
    pub owner_id: AccountId,
    pub conditions: HashMap<FungibleTokenId, U128>,
    pub bids: HashMap<FungibleTokenId, Bid>,
}

#[near_bindgen]
impl Contract {

    /// views

    pub fn get_sales_by_owner_id(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<SaleJson> {
        let mut tmp = vec![];
        let by_owner_id = self.by_owner_id.get(&account_id);
        let sales = if let Some(by_owner_id) = by_owner_id {
            by_owner_id
        } else {
            return vec![];
        };
        let keys = sales.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), sales.len());
        for i in start..end {
            let contract_and_token_id = keys.get(i).unwrap();
            let strings: Vec<&str> = contract_and_token_id.split(&DELIMETER).collect();
            let nft_contract_id = strings[0].to_string();
            let token_id = strings[1].to_string();
            let Sale {
                approval_id: _, owner_id, token_type, conditions, bids
            } = self.sales.get(&contract_and_token_id).unwrap();
            
            tmp.push(SaleJson {
                nft_contract_id: nft_contract_id.clone(),
                token_id,
                token_type,
                owner_id,
                conditions,
                bids
            });
        }
        tmp
    }

    pub fn get_sales_by_nft_contract_id(
        &self,
        nft_contract_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<SaleJson> {
        let mut tmp = vec![];
        let by_nft_contract_id = self.by_nft_contract_id.get(&nft_contract_id);
        let sales = if let Some(by_nft_contract_id) = by_nft_contract_id {
            by_nft_contract_id
        } else {
            return vec![];
        };
        let keys = sales.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), sales.len());
        for i in start..end {
            let token_id = keys.get(i).unwrap();
            let Sale {
                approval_id: _, owner_id, token_type, conditions, bids
            } = self.sales.get(&format!("{}{}{}", &nft_contract_id, DELIMETER, &token_id)).unwrap();
            
            tmp.push(SaleJson {
                nft_contract_id: nft_contract_id.clone(),
                token_id,
                token_type,
                owner_id,
                conditions,
                bids
            });
        }
        tmp
    }

    pub fn get_sales_by_nft_token_type(
        &self,
        token_type: String,
        from_index: U64,
        limit: U64,
    ) -> Vec<SaleJson> {
        let mut tmp = vec![];
        let by_nft_token_type = self.by_nft_token_type.get(&token_type);
        let sales = if let Some(by_nft_token_type) = by_nft_token_type {
            by_nft_token_type
        } else {
            return vec![];
        };
        let keys = sales.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), sales.len());
        for i in start..end {
            let contract_and_token_id = keys.get(i).unwrap();
            let strings: Vec<&str> = contract_and_token_id.split(&DELIMETER).collect();
            let nft_contract_id = strings[0].to_string();
            let token_id = strings[1].to_string();
            let Sale {
                approval_id: _, owner_id, token_type, conditions, bids
            } = self.sales.get(&contract_and_token_id).unwrap();
            
            tmp.push(SaleJson {
                nft_contract_id: nft_contract_id.clone(),
                token_id,
                token_type,
                owner_id,
                conditions,
                bids
            });
        }
        tmp
    }

    pub fn get_sale(&self, nft_contract_token: ContractAndTokenId) -> Option<Sale> {
        self.sales.get(&nft_contract_token)
    }
    
}
