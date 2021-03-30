use crate::*;

/// From Thor @ Mintbase.io

/// A provisional safe fraction type, borrowed and modified from:
/// https://github.com/near/core-contracts/blob/master/staking-pool/src/lib.rs#L127
#[derive(
  BorshDeserialize, BorshSerialize, Serialize, Deserialize, Debug, PartialEq, Copy, Clone,
)]
#[serde(crate = "near_sdk::serde")]
pub struct SafeFraction {
  pub numerator: u32,
}

impl SafeFraction {
  /// Take a u32 numerator to a 10^4 denominator.
  ///
  /// Upper limit is 10^4 so as to prevent multiplication with overflow.
  pub fn new(numerator: u32) -> Self {
    assert!(
      (0..=10000).contains(&numerator),
      "{} not between 0 and 10,000",
      numerator
    );
    SafeFraction { numerator }
  }

  /// Fractionalize a balance.
  pub fn multiply_balance(&self, value: Balance) -> Balance {
    self.numerator as u128 * value / 10_000u128
  }
}

impl std::ops::Sub for SafeFraction {
  type Output = SafeFraction;
  fn sub(self, rhs: Self) -> Self::Output {
    assert!(self.numerator >= rhs.numerator);
    Self {
      numerator: self.numerator - rhs.numerator,
    }
  }
}

impl std::ops::SubAssign for SafeFraction {
  fn sub_assign(&mut self, rhs: Self) {
    assert!(self.numerator >= rhs.numerator);
    self.numerator -= rhs.numerator;
  }
}

impl std::ops::Mul for SafeFraction {
  type Output = MultipliedSafeFraction;
  fn mul(self, rhs: Self) -> Self::Output {
    MultipliedSafeFraction {
      numerator: self.numerator * rhs.numerator,
    }
  }
}

/// A SafeFraction that has been multiplied with another SafeFraction. Denominator is 10^8.
pub struct MultipliedSafeFraction {
  pub numerator: u32,
}

impl MultipliedSafeFraction {
  /// Fractionalize a balance.
  pub fn multiply_balance(&self, value: Balance) -> Balance {
    self.numerator as u128 * value / 100_000_000u128
  }
}


/// The maximum number of addresses in a HashMap.
pub const MAX_HASHMAP_LENGTH: usize = 50;

/// A helper struct for Token. Percentages must add to 10,000. On purchase of
/// the `Token`, a percentage of the value of the transaction will be paid out
/// to each account in the `Royalty` mapping. `Royalty` field once set can NEVER
/// change for this `Token`, even if removed and re-added.
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct Royalty {
  /// Mapping of addresses to relative percentages of the overall royalty percentage
  pub split_between: HashMap<AccountId, SafeFraction>,
  /// The overall royalty percentage taken
  pub percentage: SafeFraction,
}

/// Royalty upper limit is 50%.
pub const ROYALTY_UPPER_LIMIT: u32 = 10000;

impl Royalty {
  /// Validates all arguments. Addresses must be valid and percentages must be
  /// within accepted values. Hashmap percentages must add to 10000.
  pub fn new(split_between: HashMap<AccountId, u32>, percentage: u32) -> Self {
    assert!(
      percentage <= ROYALTY_UPPER_LIMIT,
      "percentage: {} must be <= {}",
      percentage,
      ROYALTY_UPPER_LIMIT
    );
    assert!(percentage > 0, "percentage cannot be zero");
    assert!(
      split_between.len() <= MAX_HASHMAP_LENGTH,
      "royalty mapping too long"
    );
    assert!(!split_between.is_empty(), "royalty mapping is empty");

    let mut sum: u32 = 0;
    let split_between: HashMap<AccountId, SafeFraction> = split_between
      .into_iter()
      .map(|(addr, numerator)| {
        assert!(env::is_valid_account_id(&addr.as_bytes().to_vec()));
        assert!(numerator > 0, "percentage cannot be zero");

        let sf = SafeFraction::new(numerator);
        sum += sf.numerator;

        (addr, sf)
      })
      .collect();
    assert_eq!(sum, 10_000, "fractions don't add to 10,000");

    Self {
      percentage: SafeFraction::new(percentage),
      split_between,
    }
  }
}