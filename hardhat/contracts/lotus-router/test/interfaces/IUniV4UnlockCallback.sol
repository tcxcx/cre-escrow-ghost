// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

/// @notice Callback interface for Uniswap V4 PoolManager.unlock().
/// Implementations receive this callback during the unlock flow and must
/// settle all balance deltas before returning.
interface IUniV4UnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}
