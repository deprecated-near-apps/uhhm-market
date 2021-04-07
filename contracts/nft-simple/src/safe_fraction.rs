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

