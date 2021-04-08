
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LookupSet};
use near_sdk::json_types::{ValidAccountId, U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Balance, Gas, PanicOnDefault, Promise,
    PromiseResult,
};
use std::collections::HashMap;
use std::convert::TryFrom;

use crate::internal::*;
use crate::external::*;
use crate::sale::*;

mod internal;
mod external;
mod sale;
mod ft_callbacks;
mod nft_callbacks;

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc<'_> = near_sdk::wee_alloc::WeeAlloc::INIT;

/// measuring how many royalties can be paid
const GAS_FOR_FT_TRANSFER: Gas = 10_000_000_000_000;
/// seems to be the max TGas can attach to resolve_purchase
const GAS_FOR_ROYALTIES: Gas = 130_000_000_000_000;
const GAS_FOR_NFT_TRANSFER: Gas = 15_000_000_000_000;
const NO_DEPOSIT: Balance = 0;
const STORAGE_AMOUNT: u128 = 100_000_000_000_000_000_000_000;

pub type TokenId = String;
pub type ContractAndTokenId = String;
pub type Payout = HashMap<AccountId, u128>;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub sales: LookupMap<ContractAndTokenId, Sale>,
    pub ft_token_ids: LookupSet<AccountId>,
    pub storage_deposits: LookupSet<AccountId>,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: ValidAccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner_id: owner_id.into(),
            sales: LookupMap::new(b"s".to_vec()),
            ft_token_ids: LookupSet::new(b"t".to_vec()),
            storage_deposits: LookupSet::new(b"d".to_vec()),
        }
    }

    /// only owner
    pub fn add_token(&mut self, ft_contract_id: ValidAccountId) -> bool {
        self.assert_owner();
        self.ft_token_ids.insert(ft_contract_id.as_ref())
    }

    #[payable]
    pub fn storage_deposit(&mut self) -> bool {
        assert_eq!(
            env::attached_deposit(),
            STORAGE_AMOUNT,
            "Attach {}",
            STORAGE_AMOUNT
        );
        self.storage_deposits.insert(&env::predecessor_account_id())
    }

    #[payable]
    pub fn storage_withdraw(&mut self) -> bool {
        assert_one_yocto();
        let predecessor = env::predecessor_account_id();
        if self.storage_deposits.remove(&predecessor) {
            Promise::new(predecessor).transfer(STORAGE_AMOUNT);
            true
        } else {
            false
        }
    }

    pub fn supports_token(&self, ft_contract_id: ValidAccountId) -> bool {
        self.ft_token_ids.contains(ft_contract_id.as_ref())
    }

    pub fn storage_amount(&self) -> U128 {
        U128(STORAGE_AMOUNT)
    }
}
