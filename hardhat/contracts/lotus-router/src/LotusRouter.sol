// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

import { Action } from "src/types/Action.sol";
import { BytesCalldata } from "src/types/BytesCalldata.sol";

import { Error } from "src/types/Error.sol";
import { Ptr, findPtr } from "src/types/PayloadPointer.sol";
import { AgentIdentity } from "src/types/protocols/AgentIdentity.sol";
import { AgentValidation } from "src/types/protocols/AgentValidation.sol";
import { ERC20 } from "src/types/protocols/ERC20.sol";
import { ERC6909 } from "src/types/protocols/ERC6909.sol";
import { ERC721 } from "src/types/protocols/ERC721.sol";
import { UniV2Pair } from "src/types/protocols/UniV2Pair.sol";
import { UniV3Pool } from "src/types/protocols/UniV3Pool.sol";
import { UniV4PoolManager } from "src/types/protocols/UniV4PoolManager.sol";
import { WETH } from "src/types/protocols/WETH.sol";
import { dynCall } from "src/types/protocols/Dyn.sol";
import { BBCDecoder } from "src/util/BBCDecoder.sol";

// +---------------------------------------------------------------------------+
// | ## The Lotus Router Manifesto                                             |
// |                                                                           |
// | I am the Lotus Router.                                                    |
// |                                                                           |
// | I exist for the individual.                                               |
// | I exist for the collective.                                               |
// | I exist for the developers.                                               |
// | I exist for the users.                                                    |
// |                                                                           |
// | I exist, above all else, to empower.                                      |
// |                                                                           |
// | I do not to extract value.                                                |
// | I do not to capture rent.                                                 |
// | I am a political statement, as all software is.                           |
// |                                                                           |
// | I subscribe to no -ism.                                                   |
// | I wave no banner.                                                         |
// | I am an act of defiance against hoarders of technology and capital.       |
// |                                                                           |
// | I bear the license of free, as in cost AND freedom, software.             |
// | I am free for distribution.                                               |
// | I am free for study.                                                      |
// | I am free for modification.                                               |
// | I am free for redistribution.                                             |
// |                                                                           |
// | I ask only that redistributions of me bear the same license.              |
// |                                                                           |
// |                                ___                                        |
// |                          ___  /   \  ___                                  |
// |                         /   \/  |  \/   \                                 |
// |                        / /   \ ___ /   \ \                                |
// |                        \ \    /   \    / /                                |
// |                      ,-----,/       \,-----,                              |
// |                      \      \   |   /      /                              |
// |                       \ \    \  |  /    / /                               |
// |                     __-\_\____\ | /____/_/-__                             |
// |                    '--___      '-'      ___--'                            |
// |                          '----_____----'                                  |
// +---------------------------------------------------------------------------+

/// @title Lotus Router
/// @author Nameless Researchers and Developers of Ethereum
contract LotusRouter {
    // ## Fallback Function
    //
    // This contains all of the Lotus Router's execution logic.
    //
    // We use the fallback function to eschew Solidity's ABI encoding scheme.
    // Documentation is be provided for interfacing with this safely.
    fallback() external payable {
        Ptr ptr = findPtr();
        Action action;
        bool success = true;

        while (success) {
            (ptr, action) = ptr.nextAction();

            if (action == Action.Halt) {
                assembly {
                    stop()
                }
            } else if (action == Action.SwapUniV2) {
                bool canFail;
                UniV2Pair pair;
                uint256 amount0Out;
                uint256 amount1Out;
                address to;
                BytesCalldata data;

                (ptr, canFail, pair, amount0Out, amount1Out, to, data) =
                    BBCDecoder.decodeSwapUniV2(ptr);

                success = pair.swap(amount0Out, amount1Out, to, data) || canFail;
            } else if (action == Action.SwapUniV3) {
                bool canFail;
                UniV3Pool pool;
                address recipient;
                bool zeroForOne;
                int256 amountSpecified;
                uint160 sqrtPriceLimitX96;
                BytesCalldata data;

                (
                    ptr,
                    canFail,
                    pool,
                    recipient,
                    zeroForOne,
                    amountSpecified,
                    sqrtPriceLimitX96,
                    data
                ) = BBCDecoder.decodeSwapUniV3(ptr);

                success = pool.swap(recipient, zeroForOne, amountSpecified, sqrtPriceLimitX96, data)
                    || canFail;
            } else if (action == Action.FlashUniV3) {
                bool canFail;
                UniV3Pool pool;
                address recipient;
                uint256 amount0;
                uint256 amount1;
                BytesCalldata data;

                (ptr, canFail, pool, recipient, amount0, amount1, data) =
                    BBCDecoder.decodeFlashUniV3(ptr);

                success = pool.flash(recipient, amount0, amount1, data) || canFail;
            } else if (action == Action.TransferERC20) {
                bool canFail;
                ERC20 token;
                address receiver;
                uint256 amount;

                (ptr, canFail, token, receiver, amount) = BBCDecoder.decodeTransferERC20(ptr);

                success = token.transfer(receiver, amount) || canFail;
            } else if (action == Action.TransferFromERC20) {
                bool canFail;
                ERC20 token;
                address sender;
                address receiver;
                uint256 amount;

                (ptr, canFail, token, sender, receiver, amount) =
                    BBCDecoder.decodeTransferFromERC20(ptr);

                success = token.transferFrom(sender, receiver, amount) || canFail;
            } else if (action == Action.TransferFromERC721) {
                bool canFail;
                ERC721 token;
                address sender;
                address receiver;
                uint256 amount;

                (ptr, canFail, token, sender, receiver, amount) =
                    BBCDecoder.decodeTransferFromERC721(ptr);

                success = token.transferFrom(sender, receiver, amount) || canFail;
            } else if (action == Action.TransferERC6909) {
                bool canFail;
                ERC6909 multitoken;
                address receiver;
                uint256 tokenId;
                uint256 amount;

                (ptr, canFail, multitoken, receiver, tokenId, amount) =
                    BBCDecoder.decodeTransferERC6909(ptr);

                success = multitoken.transfer(receiver, tokenId, amount) || canFail;
            } else if (action == Action.TransferFromERC6909) {
                bool canFail;
                ERC6909 multitoken;
                address sender;
                address receiver;
                uint256 tokenId;
                uint256 amount;

                (ptr, canFail, multitoken, sender, receiver, tokenId, amount) =
                    BBCDecoder.decodeTransferFromERC6909(ptr);

                success = multitoken.transferFrom(sender, receiver, tokenId, amount) || canFail;
            } else if (action == Action.DepositWETH) {
                bool canFail;
                WETH weth;
                uint256 value;

                (ptr, canFail, weth, value) = BBCDecoder.decodeDepositWETH(ptr);

                success = weth.deposit(value) || canFail;
            } else if (action == Action.WithdrawWETH) {
                bool canFail;
                WETH weth;
                uint256 value;

                (ptr, canFail, weth, value) = BBCDecoder.decodeWithdrawWETH(ptr);

                success = weth.withdraw(value) || canFail;
            } else if (action == Action.DynCall) {
                bool canFail;
                address target;
                uint256 value;
                BytesCalldata data;

                (ptr, canFail, target, value, data) = BBCDecoder.decodeDynCall(ptr);

                success = dynCall(target, value, data) || canFail;
            } else if (action == Action.SwapUniV4) {
                bool canFail;
                UniV4PoolManager poolManager;
                address currency0;
                address currency1;
                uint24 fee;
                int24 tickSpacing;
                address hooks;
                bool zeroForOne;
                int256 amountSpecified;
                uint160 sqrtPriceLimitX96;
                BytesCalldata hookData;

                (
                    ptr,
                    canFail,
                    poolManager,
                    currency0,
                    currency1,
                    fee,
                    tickSpacing,
                    hooks,
                    zeroForOne,
                    amountSpecified,
                    sqrtPriceLimitX96,
                    hookData
                ) = BBCDecoder.decodeSwapUniV4(ptr);

                success = poolManager.swapV4(
                    currency0,
                    currency1,
                    fee,
                    tickSpacing,
                    hooks,
                    zeroForOne,
                    amountSpecified,
                    sqrtPriceLimitX96,
                    hookData
                ) || canFail;
            } else if (action == Action.VerifyAgent) {
                bool canFail;
                AgentIdentity registry;
                uint256 agentId;
                address expectedOwner;

                (ptr, canFail, registry, agentId, expectedOwner) =
                    BBCDecoder.decodeVerifyAgent(ptr);

                success = registry.verifyAgent(agentId, expectedOwner) || canFail;
            } else if (action == Action.VerifyAgentWallet) {
                bool canFail;
                AgentIdentity registry;
                uint256 agentId;
                address expectedWallet;

                (ptr, canFail, registry, agentId, expectedWallet) =
                    BBCDecoder.decodeVerifyAgentWallet(ptr);

                success = registry.getAgentWallet(agentId, expectedWallet) || canFail;
            } else if (action == Action.CheckValidation) {
                bool canFail;
                AgentValidation registry;
                bytes32 requestHash;
                uint8 minResponse;

                (ptr, canFail, registry, requestHash, minResponse) =
                    BBCDecoder.decodeCheckValidation(ptr);

                success = registry.checkValidation(requestHash, minResponse) || canFail;
            } else {
                success = false;
            }
        }

        revert Error.CallFailure();
    }

    // ## Receiver Function
    //
    // This triggers when this contract is called with no calldata. It takes no
    // action, it only returns gracefully.
    receive() external payable { }
}
