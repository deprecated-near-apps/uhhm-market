use crate::*;
use near_sdk::borsh::{self};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: U64,
    pub price: U128,
    pub ft_token_id: AccountId,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleArgs {
    pub price: U128,
    pub ft_token_id: Option<AccountId>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PurchaseArgs {
    pub nft_contract_id: AccountId,
    pub token_id: TokenId,
}

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn add_sale(
        &mut self,
        nft_contract_id: ValidAccountId,
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
        let contract_id: AccountId = nft_contract_id.into();

        let SaleArgs {
            price,
            ft_token_id,
        } = sale_args;

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
                price,
                ft_token_id: sale_ft_token_id,
            },
        );
    }

    pub fn update_price(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
        price: U128,
    ) {
        let contract_id: AccountId = nft_contract_id.into();
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
    pub fn remove_sale(&mut self, nft_contract_id: ValidAccountId, token_id: String) {
        let contract_id: AccountId = nft_contract_id.into();
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
        nft_contract_id: ValidAccountId,
        token_id: String,
    ) -> Promise {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let sale = self.sales.get(&contract_and_token_id).expect("No sale");
        
        let deposit = env::attached_deposit();
        assert_eq!(
            env::attached_deposit(),
            u128::from(sale.price),
            "Must pay exactly the sale amount {}",
            deposit
        );
        self.process_purchase(contract_id, token_id, env::predecessor_account_id())
    }

    /// self callback once we have the royalty

    pub fn process_purchase(
        &mut self,
        nft_contract_id: AccountId,
        token_id: String,
        buyer_id: AccountId,
    ) -> Promise {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let sale = self.sales.remove(&contract_and_token_id).expect("No sale");

        ext_contract::nft_transfer(
            buyer_id.clone(),
            token_id.clone(),
            sale.owner_id.clone(),
            None,
            sale.price,
            &contract_id,
            1,
            GAS_FOR_NFT_TRANSFER,
        )
        .then(ext_self::resolve_purchase(
            buyer_id,
            sale,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_ROYALTIES,
        ))
    }

    /// self callback

    #[private]
    pub fn resolve_purchase(
        &mut self,
        buyer_id: AccountId,
        sale: Sale,
    ) -> U128 {
        // checking for payout information
        let payout_option = match env::promise_result(0) {
            PromiseResult::NotReady => unreachable!(),
            PromiseResult::Failed => {
                None
            },
            PromiseResult::Successful(value) => {
                // None means a bad payout from bad NFT contract
                near_sdk::serde_json::from_slice::<Payout>(&value).ok().and_then(|payout| {
                    // gas to do 8 FT transfers (and definitely 8 NEAR transfers)
                    if payout.len() > 8 {
                        None
                    } else {
                        // payouts must == sale.price, otherwise something wrong with NFT contract
                        // TODO off by 1 e.g. payouts are fractions of 3333 + 3333 + 3333
                        let sum: u128 = payout.values().map(|a| *a).reduce(|a, b| a + b).unwrap();
                        if sum == u128::from(sale.price) {
                            Some(payout)
                        } else {
                            None
                        }
                    }
                })
            }
        };

        // is payout option valid?
        let payout = if let Some(payout_option) = payout_option {
            payout_option
        } else {
            env::log(format!("Refunding {} to {}", u128::from(sale.price), buyer_id).as_bytes());
            // refund NEAR
            if sale.ft_token_id.is_empty() {
                Promise::new(buyer_id).transfer(u128::from(sale.price));
            }
            // leave function and return all FTs in ft_resolve_transfer
            return sale.price;
        };

        env::log(format!("Royalty {:?}", payout).as_bytes());

        // pay seller and remove sale
        if sale.ft_token_id.is_empty() {
            for (receiver_id, amount) in &payout {
                env::log(format!("NEAR payout payment {} to {}", *amount, receiver_id).as_bytes());
                Promise::new(receiver_id.to_string()).transfer(*amount);
            }
            // refund all FTs if any
            sale.price
        } else {
            for (receiver_id, amount) in &payout {
                env::log(format!("FT payout payment {} to {}", *amount, receiver_id).as_bytes());
                ext_contract::ft_transfer(
                    receiver_id.to_string(),
                    U128(*amount),
                    None,
                    &sale.ft_token_id,
                    1,
                    GAS_FOR_FT_TRANSFER,
                );
            }
            // keep all FTs because we already transferred for royalties
            U128(0)
        }
    }                             

    /// view methods

    pub fn get_sale(&self, nft_contract_id: ValidAccountId, token_id: String) -> Sale {
        let contract_id: AccountId = nft_contract_id.into();
        self.sales
            .get(&format!("{}:{}", contract_id, token_id))
            .expect("No sale")
    }
}

/// self call

#[ext_contract(ext_self)]
trait ExtSelf {
    fn resolve_purchase(
        &mut self,
        buyer_id: AccountId,
        sale: Sale,
    ) -> Promise;
}
