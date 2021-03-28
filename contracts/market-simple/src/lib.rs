use std::convert::TryFrom;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, LookupSet};
use near_sdk::json_types::{U128, ValidAccountId};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, ext_contract, near_bindgen, AccountId, Gas, Balance, PanicOnDefault, Promise, PromiseResult};

use crate::internal::*;
mod internal;

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc<'_> = near_sdk::wee_alloc::WeeAlloc::INIT;


const GAS_FOR_RESOLVE_TRANSFER: Gas = 10_000_000_000_000;
const GAS_FOR_NFT_TRANSFER_CALL: Gas = 25_000_000_000_000 + GAS_FOR_RESOLVE_TRANSFER;
const NO_DEPOSIT: Balance = 0;
const STORAGE_AMOUNT: u128 = 100_000_000_000_000_000_000_000;
pub type TokenId = String;
pub type ContractAndTokenId = String;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: u64,
    pub beneficiary: AccountId,
    pub price: U128,
    pub token: AccountId,
    pub locked: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleArgs {
    pub price: U128,
    pub beneficiary: Option<AccountId>,
    pub token: Option<AccountId>,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub sales: LookupMap<ContractAndTokenId, Sale>,
    pub tokens: LookupSet<AccountId>,
    pub token_escrow: LookupMap<AccountId, LookupMap<TokenId, Balance>>,
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
            tokens: LookupSet::new(b"t".to_vec()),
            token_escrow: LookupMap::new(b"e".to_vec()),
            storage_deposits: LookupSet::new(b"d".to_vec()),
        }
    }

    /// only owner
    pub fn add_token(&mut self, token_contract_id: ValidAccountId) -> bool {
        self.assert_owner();
        self.tokens.insert(token_contract_id.as_ref())
    }

    #[payable]
    pub fn storage_deposit(&mut self) -> bool {
        assert_eq!(env::attached_deposit(), STORAGE_AMOUNT, "Attach {}", STORAGE_AMOUNT);
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
        approval_id: u64,
        sale_args: SaleArgs
    ) {
        assert!(self.storage_deposits.contains(owner_id.as_ref()), "Must call storage_deposit with {} to sell on this market.", STORAGE_AMOUNT);
        let contract_id: AccountId = token_contract_id.into();

        let SaleArgs {
            price,
            beneficiary,
            token,
        } = sale_args;
        
        // if you are making a sale on someone's behalf and you want to escrow the funds (guest accounts)
        let mut sale_beneficiary = owner_id.clone();
        if let Some(beneficiary) = beneficiary {
            sale_beneficiary = ValidAccountId::try_from(beneficiary).expect("Beneficiary should be valid account id");
        }

        // if sale is denominated in some other token
        let mut sale_token = "".to_string();
        if let Some(token) = token {
            sale_token = token;
        }

        env::log(format!("add_sale for owner: {}", owner_id.clone().as_ref()).as_bytes());
        
        self.sales.insert(&format!("{}:{}", contract_id, token_id), &Sale{
            owner_id: owner_id.into(),
            approval_id,
            beneficiary: sale_beneficiary.into(),
            price,
            token: sale_token.into(),
            locked: false,
        });
    }
    
    pub fn update_price(&mut self, token_contract_id: ValidAccountId, token_id: String, price: U128) {
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
        let sale = self.sales.remove(&format!("{}:{}", contract_id, token_id)).expect("No sale");
        assert_eq!(
            env::predecessor_account_id(),
            sale.owner_id,
            "Must be sale owner"
        );
    }

    #[payable]
    pub fn purchase(&mut self, token_contract_id: ValidAccountId, token_id: String) -> Promise {
        let contract_id: AccountId = token_contract_id.clone().into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        assert_eq!(sale.locked, false, "Sale is currently in progress");
        
        let price = u128::from(sale.price);
        let ft_token_id = sale.token.clone();
        let predecessor = env::predecessor_account_id();
        let contract_id: AccountId = token_contract_id.into();

        if ft_token_id.len() != 0 {
            let mut escrow = self.token_escrow.get(&predecessor).expect("Account has no escrowed tokens");
            let mut tokens = escrow.get(&ft_token_id).expect("Account has no tokens");
            assert!(tokens > price, "Not enough tokens: {}, to pay {}", tokens, price);
            tokens -= price;
            escrow.insert(&ft_token_id, &tokens);
            self.token_escrow.insert(&predecessor, &escrow);
        } else {
            let deposit = env::attached_deposit();
            assert_eq!(
                env::attached_deposit(),
                price,
                "Must pay exactly the sale amount {}", deposit
            );
        }
        
        sale.locked = true;
        self.sales.insert(&contract_and_token_id, &sale);
        let receiver_id = ValidAccountId::try_from(predecessor.clone()).unwrap();
        let owner_id = ValidAccountId::try_from(sale.owner_id).unwrap();
        let memo: String = "Sold by Matt Market".to_string();
        // call NFT contract transfer call function
        ext_transfer::nft_transfer(
            receiver_id,
            token_id.clone(),
            owner_id, // who added sale must still be token owner
            memo,
            &contract_id,
            1,
            env::prepaid_gas() - GAS_FOR_NFT_TRANSFER_CALL,
        ).then(ext_self::nft_resolve_purchase(
            contract_id,
            token_id,
            predecessor,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_RESOLVE_TRANSFER,
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
        // value is nothing, checking if nft_transfer was Successful promise execution
        if let PromiseResult::Successful(_value) = env::promise_result(0) {
            // pay seller and remove sale
            let sale = self.sales.remove(&contract_and_token_id).expect("No sale");
            
            let price = u128::from(sale.price);
            let ft_token_id = sale.token;
            let beneficiary = sale.beneficiary;

            if ft_token_id.len() != 0 {
                let mut escrow = self
                    .token_escrow
                    .get(&beneficiary)
                    .unwrap_or_else(|| LookupMap::new(unique_prefix(&beneficiary)));
                let mut tokens = escrow.get(&ft_token_id).unwrap_or_else(|| 0);
                tokens += price;
                escrow.insert(&ft_token_id, &tokens);
                self.token_escrow.insert(&beneficiary, &escrow);
            } else {
                Promise::new(beneficiary).transfer(u128::from(sale.price));
            }

            return true;
        }
        // no promise result, refund buyer and update sale state to not processing
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let price = u128::from(sale.price);
        let ft_token_id = sale.token.clone();
        if ft_token_id.len() != 0 {
            let mut escrow = self.token_escrow.get(&buyer_id).expect("Account has no tokens, but should...");
            let mut tokens = escrow.get(&ft_token_id).unwrap_or_else(|| 0);
            tokens += price;
            escrow.insert(&ft_token_id, &tokens);
            self.token_escrow.insert(&buyer_id, &escrow);
        } else {
            Promise::new(buyer_id).transfer(u128::from(sale.price));
        }
        sale.locked = false;
        self.sales.insert(&contract_and_token_id, &sale);
        return false;
    }

    /// escrowed funds

    #[payable]
    pub fn withdraw_all(&mut self, token_contract_id: AccountId ) {
        assert_one_yocto();
        let receiver_id = env::predecessor_account_id();
        let escrowed_tokens = self.token_escrow.get(&receiver_id).expect("Account has no escrowed tokens");
        let tokens = escrowed_tokens.get(&token_contract_id).expect("Account has no tokens");
        
        if tokens > 0 {
            // call NFT contract transfer call function
            ext_transfer::ft_transfer(
                receiver_id,
                tokens, 
                None,
                &token_contract_id,
                1,
                env::prepaid_gas() - GAS_FOR_NFT_TRANSFER_CALL,
            );
        }
    }

    /// view methods

    pub fn get_token_balance(&self, account_id: AccountId, token_contract_id: AccountId) -> U128 {
        let escrowed_tokens = self.token_escrow.get(&account_id).expect("Account has no escrowed tokens");
        U128(escrowed_tokens.get(&token_contract_id).expect("Account has no token balance"))
    }

    pub fn get_sale(&self, token_contract_id: ValidAccountId, token_id: String) -> Sale {
        let contract_id: AccountId = token_contract_id.into();
        self.sales.get(&format!("{}:{}", contract_id, token_id.clone())).expect("No sale")
    }

    pub fn supports_token(&self, token_contract_id: ValidAccountId) -> bool {
        self.tokens.contains(token_contract_id.as_ref())
    }

    pub fn storage_amount(&self) -> U128 {
        U128(STORAGE_AMOUNT)
    }
}

#[ext_contract(ext_self)]
trait ResolvePurchase {
    fn nft_resolve_purchase(
        &mut self,
        token_contract_id: AccountId,
        token_id: TokenId,
        buyer_id: AccountId,
    ) -> Promise;
}

#[ext_contract(ext_transfer)]
trait ExtTransfer {
    fn nft_transfer(
        &mut self,
        receiver_id: ValidAccountId,
        token_id: TokenId,
        enforce_owner_id: ValidAccountId,
        memo: String,
    );
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: u128, memo: Option<String>);
}

/// approval callbacks from NFT Contracts 

trait NonFungibleTokenApprovalsReceiver {
    fn nft_on_approve(
        &mut self,
        token_contract_id: ValidAccountId,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: u64,
        msg: Option<String>,
    ) -> bool;
}

#[near_bindgen]
impl NonFungibleTokenApprovalsReceiver for Contract {
    #[payable]
    fn nft_on_approve(
        &mut self,
        token_contract_id: ValidAccountId,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: u64,
        msg: Option<String>,
    ) -> bool {
        let contract: AccountId = token_contract_id.clone().into();
        assert_eq!(env::predecessor_account_id(), contract, "Approval callbacks need to be called by the NFT Contract");
        if let Some(msg) = msg {
            let sale_args: SaleArgs = near_sdk::serde_json::from_str(&msg).expect("Valid SaleArgs");
            self.add_sale(token_contract_id, token_id, owner_id, approval_id, sale_args);
            true
        } else {
            false
        }
    }
}

/// approval callbacks from FT Contracts

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
        let token_contract_id = env::predecessor_account_id();

        env::log(format!("tokens transferred {} {} {}", sender_id.clone(), u128::from(amount.clone()), msg.clone()).as_bytes());

        let mut escrow = self
            .token_escrow
            .get(&sender_id)
            .unwrap_or_else(|| LookupMap::new(unique_prefix(&sender_id)));

        // check for existing balance (increment) and insert new balance
        let balance = u128::from(amount) + escrow.get(&token_contract_id).unwrap_or_else(|| 0);
        escrow.insert(&token_contract_id, &balance);
        self.token_escrow.insert(&sender_id, &escrow);

        // we use all the tokens sent to this contract to increase tokens.balance
        U128(0)
    }
}