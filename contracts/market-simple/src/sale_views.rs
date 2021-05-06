use crate::*;

#[near_bindgen]
impl Contract {

    /// views

    pub fn get_sales_by_owner_id(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<Sale> {
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
            tmp.push(self.sales.get(&keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    pub fn get_sales_by_nft_contract_id(
        &self,
        nft_contract_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<Sale> {
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
            tmp.push(self.sales.get(&format!("{}{}{}", &nft_contract_id, DELIMETER, &keys.get(i).unwrap())).unwrap());
        }
        tmp
    }

    pub fn get_sales_by_nft_token_type(
        &self,
        token_type: String,
        from_index: U64,
        limit: U64,
    ) -> Vec<Sale> {
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
            tmp.push(self.sales.get(&keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    pub fn get_sale(&self, nft_contract_token: ContractAndTokenId) -> Option<Sale> {
        self.sales.get(&nft_contract_token)
    }
    
}
