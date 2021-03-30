use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LookupSet};
use near_sdk::json_types::{ValidAccountId, U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, ext_contract, near_bindgen, AccountId, Balance, Gas, PanicOnDefault, Promise,
    PromiseResult,
};
use std::convert::TryFrom;

use crate::internal::*;
mod internal;

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc<'_> = near_sdk::wee_alloc::WeeAlloc::INIT;

const GAS_FOR_FT_TRANSFER: Gas = 25_000_000_000_000;
const GAS_FOR_RESOLVE_PURCHASE: Gas = 10_000_000_000_000 + GAS_FOR_FT_TRANSFER;
const GAS_FOR_NFT_PURCHASE: Gas = 25_000_000_000_000 + GAS_FOR_RESOLVE_PURCHASE;
const NO_DEPOSIT: Balance = 0;
const STORAGE_AMOUNT: u128 = 100_000_000_000_000_000_000_000;
pub type TokenId = String;
pub type ContractAndTokenId = String;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: U64,
    pub beneficiary: AccountId,
    pub price: U128,
    pub ft_token_id: AccountId,
    pub locked: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleArgs {
    pub price: U128,
    pub beneficiary: Option<AccountId>,
    pub ft_token_id: Option<AccountId>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PurchaseArgs {
    pub token_contract_id: AccountId,
    pub token_id: TokenId,
}

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
    pub fn add_token(&mut self, token_contract_id: ValidAccountId) -> bool {
        self.assert_owner();
        self.ft_token_ids.insert(token_contract_id.as_ref())
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

    #[payable]
    pub fn add_sale(
        &mut self,
        token_contract_id: ValidAccountId,
        token_id: String,
        owner_id: ValidAccountId,
        approval_id: U64,
        sale_args: SaleArgs,
    ) {
        assert!(
            self.storage_deposits.contains(owner_id.as_ref()),
            "Must call storage_deposit with {} to sell on this market.",
            STORAGE_AMOUNT
        );
        let contract_id: AccountId = token_contract_id.into();

        let SaleArgs {
            price,
            beneficiary,
            ft_token_id,
        } = sale_args;

        // if you are making a sale on someone's behalf and you want to escrow the funds (guest accounts)
        let mut sale_beneficiary = owner_id.clone();
        if let Some(beneficiary) = beneficiary {
            sale_beneficiary = ValidAccountId::try_from(beneficiary)
                .expect("Beneficiary should be valid account id");
        }

        // if sale is denominated in some other token
        let mut sale_ft_token_id = "".to_string();
        if let Some(ft_token_id) = ft_token_id {
            sale_ft_token_id = ft_token_id;
        }

        env::log(format!("add_sale for owner: {}", owner_id.as_ref()).as_bytes());

        self.sales.insert(
            &format!("{}:{}", contract_id, token_id),
            &Sale {
                owner_id: owner_id.into(),
                approval_id,
                beneficiary: sale_beneficiary.into(),
                price,
                ft_token_id: sale_ft_token_id,
                locked: false,
            },
        );
    }

    pub fn update_price(
        &mut self,
        token_contract_id: ValidAccountId,
        token_id: String,
        price: U128,
    ) {
        let contract_id: AccountId = token_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let mut sale = self.sales.remove(&contract_and_token_id).expect("No sale");
        assert_eq!(
            env::predecessor_account_id(),
            sale.owner_id,
            "Must be sale owner"
        );
        sale.price = price;
        self.sales.insert(&contract_and_token_id, &sale);
    }

    /// should be able to pull a sale without yocto redirect to wallet?
    pub fn remove_sale(&mut self, token_contract_id: ValidAccountId, token_id: String) {
        let contract_id: AccountId = token_contract_id.into();
        let sale = self
            .sales
            .remove(&format!("{}:{}", contract_id, token_id))
            .expect("No sale");
        assert_eq!(
            env::predecessor_account_id(),
            sale.owner_id,
            "Must be sale owner"
        );
    }

    #[payable]
    pub fn purchase(
        &mut self,
        token_contract_id: ValidAccountId,
        token_id: String,
        sender_id: Option<AccountId>,
    ) -> Promise {
        let contract_id: AccountId = token_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        assert_eq!(sale.locked, false, "Sale is currently in progress");
        let mut buyer_id = env::predecessor_account_id();
        if let Some(sender_id) = sender_id {
            // if sender_id.is_some() we already have the tokens in this contract
            buyer_id = sender_id
        } else {
            // purchase is in NEAR and not the result of ft_tranfer_call
            let deposit = env::attached_deposit();
            assert_eq!(
                env::attached_deposit(),
                u128::from(sale.price),
                "Must pay exactly the sale amount {}",
                deposit
            );
        }
        // lock the sale
        sale.locked = true;
        self.sales.insert(&contract_and_token_id, &sale);
        let memo: String = "Sold by Matt Market".to_string();
        // call NFT contract transfer call function
        ext_nft_transfer::nft_transfer(
            buyer_id.clone(),
            token_id.clone(),
            sale.owner_id,
            memo,
            &contract_id,
            1,
            env::prepaid_gas() - GAS_FOR_NFT_PURCHASE,
        )
        .then(ext_self::nft_resolve_purchase(
            contract_id,
            token_id,
            buyer_id,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_RESOLVE_PURCHASE,
        ))
    }

    /// self callback

    pub fn nft_resolve_purchase(
        &mut self,
        token_contract_id: AccountId,
        token_id: TokenId,
        buyer_id: AccountId,
    ) -> bool {
        env::log(format!("Promise Result {:?}", env::promise_result(0)).as_bytes());
        let contract_and_token_id = format!("{}:{}", token_contract_id, token_id);

        // checking if nft_transfer was Successful promise execution
        if let PromiseResult::Successful(_value) = env::promise_result(0) {
            // pay seller and remove sale
            let sale = self.sales.remove(&contract_and_token_id).expect("No sale");
            let beneficiary = sale.beneficiary;

            if !sale.ft_token_id.is_empty() {
                ext_ft_transfer::ft_transfer(
                    beneficiary,
                    sale.price,
                    None,
                    &sale.ft_token_id,
                    1,
                    env::prepaid_gas() - GAS_FOR_FT_TRANSFER,
                );
            } else {
                Promise::new(beneficiary).transfer(sale.price.into());
            }
            return true;
        }
        // no promise result, refund buyer and update sale state
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        if !sale.ft_token_id.is_empty() {
            ext_ft_transfer::ft_transfer(
                buyer_id,
                sale.price,
                None,
                &sale.ft_token_id,
                1,
                env::prepaid_gas() - GAS_FOR_FT_TRANSFER,
            );
        } else {
            Promise::new(buyer_id).transfer(sale.price.into());
        }
        sale.locked = false;
        self.sales.insert(&contract_and_token_id, &sale);
        false
    }

    /// view methods

    pub fn get_sale(&self, token_contract_id: ValidAccountId, token_id: String) -> Sale {
        let contract_id: AccountId = token_contract_id.into();
        self.sales
            .get(&format!("{}:{}", contract_id, token_id))
            .expect("No sale")
    }

    pub fn supports_token(&self, token_contract_id: ValidAccountId) -> bool {
        self.ft_token_ids.contains(token_contract_id.as_ref())
    }

    pub fn storage_amount(&self) -> U128 {
        U128(STORAGE_AMOUNT)
    }
}

/// external calls

#[ext_contract(ext_self)]
trait ResolvePurchase {
    fn nft_resolve_purchase(
        &mut self,
        token_contract_id: AccountId,
        token_id: TokenId,
        buyer_id: AccountId,
    ) -> Promise;
}

#[ext_contract(ext_nft_transfer)]
trait ExtTransfer {
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        enforce_owner_id: AccountId,
        memo: String,
    );
}

#[ext_contract(ext_ft_transfer)]
trait ExtTransfer {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(
        &mut self,
        receiver_id: ValidAccountId,
        amount: U128,
        msg: String,
        memo: Option<String>,
    );
}

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
        let contract: AccountId = env::predecessor_account_id();
        let sale_args: SaleArgs = near_sdk::serde_json::from_str(&msg).expect("Valid SaleArgs");
        self.add_sale(
            ValidAccountId::try_from(contract).unwrap(),
            token_id,
            owner_id,
            approval_id,
            sale_args,
        );
    }
}

/// approval callbacks from FT Contracts

trait FungibleTokenReceiver {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128;
}

#[near_bindgen]
impl FungibleTokenReceiver for Contract {
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        let PurchaseArgs {
            token_contract_id,
            token_id,
        } = near_sdk::serde_json::from_str(&msg).expect("Valid SaleArgs");
        let contract_and_token_id = format!("{}:{}", token_contract_id, token_id);
        let sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let ft_token_id = env::predecessor_account_id();
        assert_eq!(
            sale.ft_token_id, ft_token_id,
            "Sale doesn't accept token {}",
            ft_token_id
        );
        assert_eq!(sale.locked, false, "Sale is currently in progress");
        let price = u128::from(sale.price);
        let amount = u128::from(amount);
        assert!(amount >= price, "Not enough tokens. Price is {}", price);
        self.purchase(
            ValidAccountId::try_from(token_contract_id)
                .expect("token_contract_id should be ValidAccountId"),
            token_id,
            Some(sender_id),
        );
        U128(amount - price)
    }
}
