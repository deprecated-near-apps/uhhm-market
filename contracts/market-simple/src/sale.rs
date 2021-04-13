use crate::*;

/// measuring how many royalties can be paid
const GAS_FOR_FT_TRANSFER: Gas = 10_000_000_000_000;
/// seems to be max Tgas can attach to resolve_purchase
const GAS_FOR_ROYALTIES: Gas = 120_000_000_000_000;
const GAS_FOR_NFT_TRANSFER: Gas = 15_000_000_000_000;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Bid {
    pub owner_id: AccountId,
    pub price: U128,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: U64,
    pub conditions: HashMap<FungibleTokenId, U128>,
    pub bids: HashMap<FungibleTokenId, Bid>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleJson {
    pub nft_contract_id: AccountId,
    pub token_id: TokenId,
    pub conditions: HashMap<FungibleTokenId, U128>,
    pub bids: HashMap<FungibleTokenId, Bid>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Price {
    pub ft_token_id: AccountId,
    pub price: Option<U128>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleArgs {
    pub sale_conditions: Vec<Price>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PurchaseArgs {
    pub nft_contract_id: AccountId,
    pub token_id: TokenId,
}

#[near_bindgen]
impl Contract {

    /// for add sale see: nft_callbacks.rs

    /// TODO remove without redirect to wallet? panic reverts
    pub fn remove_sale(&mut self, nft_contract_id: ValidAccountId, token_id: String) {
        let sale = self.internal_remove_sale(nft_contract_id.into(), token_id);
        let owner_id = env::predecessor_account_id();
        assert_eq!(owner_id, sale.owner_id, "Must be sale owner");
        self.refund_bids(&sale.bids, None);
    }

    pub fn update_price(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
        ft_token_id: ValidAccountId,
        price: U128,
    ) {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        assert_eq!(env::predecessor_account_id(), sale.owner_id, "Must be sale owner");
        sale.conditions.insert(ft_token_id.into(), price);
        self.sales.insert(&contract_and_token_id, &sale);
    }

    #[payable]
    pub fn offer(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
    ) {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let buyer_id = env::predecessor_account_id();
        assert_ne!(sale.owner_id, buyer_id, "Cannot bid on your own sale.");
        let near_token_id = "near".to_string();
        let price = u128::from(*sale.conditions.get(&near_token_id).expect("Not for sale in NEAR"));
        let deposit = env::attached_deposit();

        // there's a fixed price user can buy for
        if deposit == price {
            self.process_purchase(contract_id, token_id, near_token_id, U128(deposit), buyer_id);
        } else {
            assert!(price == 0 || deposit < price, "Can't pay more than fixed price: {}", price);
            // buyer falls short of fixed price, or there is no fixed price
            // store a bid and refund any current bid lower
            let new_bid = Bid{
                owner_id: buyer_id,
                price: U128(deposit),
            };
            let current_bid = sale.bids.get(&near_token_id);
            if let Some(current_bid) = current_bid {
                // refund current bid holder
                let current_price: u128 = current_bid.price.into();
                assert!(deposit > current_price, "Can't pay less than or equal to current bid price: {}", current_price);
                Promise::new(current_bid.owner_id.clone()).transfer(current_bid.price.into());
                sale.bids.insert(near_token_id, new_bid);
            } else {
                sale.bids.insert(near_token_id, new_bid);
            }
            self.sales.insert(&contract_and_token_id, &sale);
        }
    }

    pub fn accept_offer(&mut self, nft_contract_id: ValidAccountId, token_id: String, ft_token_id: ValidAccountId) {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}:{}", contract_id.clone(), token_id.clone());
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let bid = sale.bids.remove(ft_token_id.as_ref()).expect("No bid");
        self.sales.insert(&contract_and_token_id, &sale);
        // panics at `self.internal_remove_sale` and reverts above if predecessor is not sale.owner_id
        self.process_purchase(
            contract_id,
            token_id,
            ft_token_id.into(),
            bid.price.clone(),
            bid.owner_id.clone(),
        );
    }

    /// private 

    #[private]
    pub fn process_purchase(
        &mut self,
        nft_contract_id: AccountId,
        token_id: String,
        ft_token_id: AccountId,
        price: U128,
        buyer_id: AccountId,
    ) -> Promise {
        let sale = self.internal_remove_sale(nft_contract_id.clone(), token_id.clone());
        
        ext_contract::nft_transfer_payout(
            buyer_id.clone(),
            token_id,
            sale.owner_id.clone(),
            None,
            price,
            &nft_contract_id,
            1,
            GAS_FOR_NFT_TRANSFER,
        )
        .then(ext_self::resolve_purchase(
            ft_token_id,
            buyer_id,
            sale,
            price,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_ROYALTIES,
        ))
    }

    /// self callback

    #[private]
    pub fn resolve_purchase(
        &mut self,
        ft_token_id: AccountId,
        buyer_id: AccountId,
        sale: Sale,
        price: U128,
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
                    // gas to do 10 FT transfers (and definitely 10 NEAR transfers)
                    if payout.len() + sale.bids.len() > 8 {
                        None
                    } else {
                        // payouts must == sale.price, otherwise something wrong with NFT contract
                        // TODO off by 1 e.g. payouts are fractions of 3333 + 3333 + 3333
                        let sum: u128 = payout.values().map(|a| *a).reduce(|a, b| a + b).unwrap();
                        if sum == u128::from(price) {
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
            // env::log(format!("Refunding {} to {}", u128::from(price), buyer_id).as_bytes());
            // refund NEAR
            if ft_token_id == "near" {
                Promise::new(buyer_id).transfer(u128::from(price));
            }
            // leave function and return all FTs in ft_resolve_transfer
            return price;
        };

        // env::log(format!("Payouts {:?}", payout).as_bytes());

        // Payback bids that were not claimed
        self.refund_bids(&sale.bids, Some(ft_token_id.clone()));

        // NEAR payouts
        if ft_token_id == "near" {
            for (receiver_id, amount) in &payout {
                Promise::new(receiver_id.to_string()).transfer(*amount);
            }
            // refund all FTs (won't be any)
            price
        } else {
        // FT payouts
            for (receiver_id, amount) in &payout {
                ext_contract::ft_transfer(
                    receiver_id.to_string(),
                    U128(*amount),
                    None,
                    &ft_token_id,
                    1,
                    GAS_FOR_FT_TRANSFER,
                );
            }
            // keep all FTs (already transferred for payouts)
            U128(0)
        }
    }

    #[private]
    pub fn refund_bids(&mut self, bids: &HashMap<FungibleTokenId, Bid>, ft_token_id: Option<FungibleTokenId>) {
        let mut ft_used = "".to_string();
        if let Some(ft_token_id) = ft_token_id {
            ft_used = ft_token_id
        }
        for (bid_ft, bid) in bids {
            if ft_used == *bid_ft {
                continue;
            }
            if bid_ft == "near" {
                Promise::new(bid.owner_id.clone()).transfer(u128::from(bid.price));
            } else {
                ext_contract::ft_transfer(
                    bid.owner_id.clone(),
                    bid.price,
                    None,
                    bid_ft,
                    1,
                    GAS_FOR_FT_TRANSFER,
                );
            }
        }
    }
}

/// self call

#[ext_contract(ext_self)]
trait ExtSelf {
    fn resolve_purchase(
        &mut self,
        ft_token_id: AccountId,
        buyer_id: AccountId,
        sale: Sale,
        price: U128,
    ) -> Promise;
}
