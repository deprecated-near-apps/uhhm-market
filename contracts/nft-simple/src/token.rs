use crate::*;

pub type TokenId = String;
pub type Payout = HashMap<AccountId, u128>;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Token {
    pub owner_id: AccountId,
    pub approved_account_ids: HashMap<AccountId, U64>,
    pub royalty: HashMap<AccountId, u32>,
    pub next_approval_id: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct JsonToken {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub metadata: TokenMetadata,
    pub royalty: HashMap<AccountId, u32>,
    pub approved_account_ids: HashMap<AccountId, U64>,
}
