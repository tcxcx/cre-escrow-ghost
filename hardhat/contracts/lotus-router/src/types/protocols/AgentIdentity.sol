// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

type AgentIdentity is address;

using { verifyAgent, getAgentWallet } for AgentIdentity global;

// ## ERC-8004 Identity Registry
//
// The Identity Registry is an ERC-721 based contract where AI agents register
// on-chain identities. Each agent receives a tokenId (agentId) and an agentURI
// pointing to a registration file describing its capabilities, endpoints, and
// supported trust models.
//
// The Lotus Router integrates with ERC-8004 to enable trustless agent
// verification as a gating action in multi-step transaction chains. If an
// agent's identity cannot be verified, the entire transaction reverts.

// ownerOf(uint256)
uint256 constant ownerOfSelector = 0x6352211e00000000000000000000000000000000000000000000000000000000;

// getAgentWallet(uint256)
uint256 constant getAgentWalletSelector = 0x0033950900000000000000000000000000000000000000000000000000000000;

// ## Verify Agent Identity
//
// Calls `ownerOf(agentId)` on the ERC-8004 Identity Registry and compares the
// returned owner address against an `expectedOwner`. This serves as a trust
// gate: if the agent is not registered (ownerOf reverts) or the owner does not
// match, the action fails.
//
// ### Parameters
//
// - registry: The ERC-8004 Identity Registry address.
// - agentId: The ERC-721 tokenId assigned to the agent.
// - expectedOwner: The address expected to own this agent identity.
//
// ### Returns
//
// - success: True if the agent exists and is owned by `expectedOwner`.
//
// ### Procedures
//
// 01. Load the free memory pointer.
// 02. Store the `ownerOfSelector`.
// 03. Store the `agentId`.
// 04. Call the `registry` with staticcall (read-only).
// 05. If the call failed, return false.
// 06. Load the returned owner address.
// 07. Compare with `expectedOwner` and return the result.
function verifyAgent(
    AgentIdentity registry,
    uint256 agentId,
    address expectedOwner
) view returns (bool success) {
    assembly ("memory-safe") {
        let fmp := mload(0x40)

        mstore(add(fmp, 0x00), ownerOfSelector)

        mstore(add(fmp, 0x04), agentId)

        success := staticcall(gas(), registry, fmp, 0x24, fmp, 0x20)

        if success {
            let owner := mload(fmp)
            success := eq(owner, expectedOwner)
        }
    }
}

// ## Get Agent Wallet
//
// Calls `getAgentWallet(agentId)` on the ERC-8004 Identity Registry and
// compares the returned wallet address against an `expectedWallet`. This
// verifies the agent's payment/interaction wallet.
//
// ### Parameters
//
// - registry: The ERC-8004 Identity Registry address.
// - agentId: The ERC-721 tokenId assigned to the agent.
// - expectedWallet: The address expected as the agent's wallet.
//
// ### Returns
//
// - success: True if the agent's wallet matches `expectedWallet`.
//
// ### Procedures
//
// 01. Load the free memory pointer.
// 02. Store the `getAgentWalletSelector`.
// 03. Store the `agentId`.
// 04. Call the `registry` with staticcall (read-only).
// 05. If the call failed, return false.
// 06. Load the returned wallet address.
// 07. Compare with `expectedWallet` and return the result.
function getAgentWallet(
    AgentIdentity registry,
    uint256 agentId,
    address expectedWallet
) view returns (bool success) {
    assembly ("memory-safe") {
        let fmp := mload(0x40)

        mstore(add(fmp, 0x00), getAgentWalletSelector)

        mstore(add(fmp, 0x04), agentId)

        success := staticcall(gas(), registry, fmp, 0x24, fmp, 0x20)

        if success {
            let wallet := mload(fmp)
            success := eq(wallet, expectedWallet)
        }
    }
}
