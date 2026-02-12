// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

import { BytesCalldata } from "src/types/BytesCalldata.sol";

type UniV4PoolManager is address;

using { swapV4 } for UniV4PoolManager global;

// ## Uniswap V4 PoolManager Singleton Address (Ethereum Mainnet)
address constant UNIV4_POOL_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;

// ## Uniswap V4 Hook Address Flags
//
// In Uniswap V4, hook permissions are encoded in the upper 14 bits of the
// hook contract address. Each bit enables a specific callback. These flags
// are used for CREATE2 address mining when deploying hook contracts.
uint160 constant BEFORE_INITIALIZE_FLAG                    = uint160(1) << 159;
uint160 constant AFTER_INITIALIZE_FLAG                     = uint160(1) << 158;
uint160 constant BEFORE_ADD_LIQUIDITY_FLAG                 = uint160(1) << 157;
uint160 constant AFTER_ADD_LIQUIDITY_FLAG                  = uint160(1) << 156;
uint160 constant BEFORE_REMOVE_LIQUIDITY_FLAG              = uint160(1) << 155;
uint160 constant AFTER_REMOVE_LIQUIDITY_FLAG               = uint160(1) << 154;
uint160 constant BEFORE_SWAP_FLAG                          = uint160(1) << 153;
uint160 constant AFTER_SWAP_FLAG                           = uint160(1) << 152;
uint160 constant BEFORE_DONATE_FLAG                        = uint160(1) << 151;
uint160 constant AFTER_DONATE_FLAG                         = uint160(1) << 150;
uint160 constant BEFORE_SWAP_RETURNS_DELTA_FLAG            = uint160(1) << 149;
uint160 constant AFTER_SWAP_RETURNS_DELTA_FLAG             = uint160(1) << 148;
uint160 constant AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG    = uint160(1) << 147;
uint160 constant AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG = uint160(1) << 146;

// swap((address,address,uint24,int24,address),(bool,int256,uint160),bytes)
uint256 constant swapV4Selector = 0xf3cd914c00000000000000000000000000000000000000000000000000000000;

// ## Execute Uniswap V4 Swap
//
// Calls the singleton PoolManager to execute a swap on a Uniswap V4 pool.
// This must be called within an active `unlock` callback context on the
// PoolManager to function correctly.
//
// ### Parameters
//
// - poolManager: The Uniswap V4 PoolManager singleton address.
// - currency0: The lower-sorted token of the pool (PoolKey.currency0).
// - currency1: The higher-sorted token of the pool (PoolKey.currency1).
// - fee: The pool fee in hundredths of a bip (PoolKey.fee).
// - tickSpacing: The tick spacing of the pool (PoolKey.tickSpacing).
// - hooks: The hooks contract address for this pool (PoolKey.hooks).
// - zeroForOne: Direction of the trade; "true": zero for one, "false": one for zero.
// - amountSpecified: The "exact" portion of the trade amount.
// - sqrtPriceLimitX96: The Q64.96 representation of the price limit.
// - hookData: Arbitrary calldata passed through to the hook callbacks.
//
// ### Returns
//
// - success: returns True if the swap succeeded.
//
// ### Notes
//
// The `amountSpecified` parameter is positive if the input amount is the
// "exact" amount parameter, but if it is negative, the output amount is the
// "exact" amount parameter. This mirrors the V3 convention.
//
// The PoolKey fields (currency0, currency1, fee, tickSpacing, hooks)
// identify the specific pool. currency0 must be the lower-sorted address.
//
// ### ABI Encoding Layout
//
// The call encodes PoolKey as an inline static tuple (5 slots), SwapParams
// as an inline static tuple (3 slots), and hookData as a dynamic bytes
// parameter with an offset pointer.
//
//   fmp+0x00:  swapV4Selector
//   fmp+0x04:  currency0
//   fmp+0x24:  currency1
//   fmp+0x44:  fee
//   fmp+0x64:  tickSpacing (sign-extended to int256)
//   fmp+0x84:  hooks
//   fmp+0xa4:  zeroForOne
//   fmp+0xc4:  amountSpecified
//   fmp+0xe4:  sqrtPriceLimitX96
//   fmp+0x104: 0x120 (offset to hookData from start of params)
//   fmp+0x124: hookDataLen
//   fmp+0x144: hookData bytes...
//
// Total calldata size: 0x144 + hookDataLen
//
// ### Procedures
//
// 01. Load the free memory pointer.
// 02. Load the `hookData` length as a 32 bit integer.
// 03. Increment the `hookData` pointer to the beginning of the bytes.
// 04. Store the `swapV4Selector`.
// 05. Store the `currency0`.
// 06. Store the `currency1`.
// 07. Store the `fee`.
// 08. Store the `tickSpacing` (sign-extended).
// 09. Store the `hooks`.
// 10. Store the `zeroForOne`.
// 11. Store the `amountSpecified`.
// 12. Store the `sqrtPriceLimitX96`.
// 13. Store the `hookData` offset (0x120).
// 14. Store the `hookDataLen`.
// 15. Copy the hookData from calldata to memory.
// 16. Call the `poolManager` contract, returning `success`.
function swapV4(
    UniV4PoolManager poolManager,
    address currency0,
    address currency1,
    uint24 fee,
    int24 tickSpacing,
    address hooks,
    bool zeroForOne,
    int256 amountSpecified,
    uint160 sqrtPriceLimitX96,
    BytesCalldata hookData
) returns (bool success) {
    assembly ("memory-safe") {
        let fmp := mload(0x40)

        let hookDataLen := shr(0xe0, calldataload(hookData))

        hookData := add(hookData, 0x04)

        mstore(add(fmp, 0x00), swapV4Selector)

        mstore(add(fmp, 0x04), currency0)

        mstore(add(fmp, 0x24), currency1)

        mstore(add(fmp, 0x44), fee)

        mstore(add(fmp, 0x64), signextend(0x02, tickSpacing))

        mstore(add(fmp, 0x84), hooks)

        mstore(add(fmp, 0xa4), zeroForOne)

        mstore(add(fmp, 0xc4), amountSpecified)

        mstore(add(fmp, 0xe4), sqrtPriceLimitX96)

        mstore(add(fmp, 0x104), 0x120)

        mstore(add(fmp, 0x124), hookDataLen)

        calldatacopy(add(fmp, 0x144), hookData, hookDataLen)

        success := call(gas(), poolManager, 0x00, fmp, add(hookDataLen, 0x144), 0x00, 0x00)
    }
}
