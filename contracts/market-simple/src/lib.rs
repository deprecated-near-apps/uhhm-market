use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LookupSet, UnorderedSet, UnorderedMap};
use near_sdk::json_types::{ValidAccountId, U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Balance, Gas, PanicOnDefault, Promise,
    PromiseResult,
};
use std::cmp::min;
use std::collections::HashMap;

use crate::internal::*;
use crate::external::*;
use crate::sale::*;

mod internal;
mod external;
mod sale;
mod sale_views;
mod ft_callbacks;
mod nft_callbacks;

near_sdk::setup_alloc!();

// TODO check seller supports storage_deposit at ft_token_id they want to post sale in

const NO_DEPOSIT: Balance = 0;
const STORAGE_PER_SALE: u128 = 10_000_000_000_000_000_000_000;

pub type TokenId = String;
pub type FungibleTokenId = AccountId;
pub type ContractAndTokenId = String;
pub type Payout = HashMap<AccountId, u128>;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub sales: UnorderedMap<ContractAndTokenId, Sale>,
    pub by_owner_id: LookupMap<AccountId, UnorderedSet<ContractAndTokenId>>,
    pub by_nft_contract_id: LookupMap<AccountId, UnorderedSet<TokenId>>,
    pub ft_token_ids: LookupSet<AccountId>,
    pub storage_deposits: LookupMap<AccountId, Balance>,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: ValidAccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        let mut this = Self {
            owner_id: owner_id.into(),
            sales: UnorderedMap::new(b"s".to_vec()),
            by_owner_id: LookupMap::new(b"b".to_vec()),
            by_nft_contract_id: LookupMap::new(b"n".to_vec()),
            ft_token_ids: LookupSet::new(b"t".to_vec()),
            storage_deposits: LookupMap::new(b"d".to_vec()),
        };
        // support NEAR by default
        this.ft_token_ids.insert(&"near".to_string());

        this
    }

    /// only owner
    pub fn add_token(&mut self, ft_token_id: ValidAccountId) -> bool {
        self.assert_owner();
        self.ft_token_ids.insert(ft_token_id.as_ref())
    }

    #[payable]
    pub fn storage_deposit(&mut self, account_id: Option<AccountId>) {
        let storage_account_id = if let Some(account_id) = account_id {
            account_id
        } else {
            env::predecessor_account_id()
        };
        let deposit = env::attached_deposit();
        assert!(deposit >= STORAGE_PER_SALE, "Requires minimum deposit of {}", STORAGE_PER_SALE);
        let mut balance: u128 = self.storage_deposits.get(&storage_account_id).unwrap_or(0);
        balance += deposit;
        self.storage_deposits.insert(&storage_account_id, &balance);
    }

    #[payable]
    pub fn storage_withdraw(&mut self) -> bool {
        let predecessor = env::predecessor_account_id();
        let amount = self.storage_deposits.remove(&predecessor);
        if let Some(amount) = amount {
            Promise::new(predecessor).transfer(amount);
            true
        } else {
            false
        }
    }

    /// views

    pub fn supports_token(&self, ft_token_id: ValidAccountId) -> bool {
        self.ft_token_ids.contains(ft_token_id.as_ref())
    }

    pub fn storage_amount(&self) -> U128 {
        U128(STORAGE_PER_SALE)
    }
    
    pub fn storage_paid(&self, account_id: ValidAccountId) -> U128 {
        U128(self.storage_deposits.get(account_id.as_ref()).unwrap_or(0))
    }
}
