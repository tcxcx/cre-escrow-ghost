// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity 0.8.28;

type AgentValidation is address;

using { checkValidation } for AgentValidation global;

// ## ERC-8004 Validation Registry
//
// The Validation Registry enables agents to request verification of their work
// and allows validator smart contracts (e.g. stake-secured re-execution, zkML
// verifiers, TEE oracles) to provide responses tracked on-chain.
//
// The Lotus Router integrates with the Validation Registry as a trust gate:
// before executing high-value operations, a CheckValidation action can verify
// that an agent's work has been validated above a minimum confidence threshold.

// getValidationStatus(bytes32)
uint256 constant getValidationStatusSelector = 0xff2febfc00000000000000000000000000000000000000000000000000000000;

// ## Check Validation Status
//
// Calls `getValidationStatus(requestHash)` on the ERC-8004 Validation Registry
// and checks that the validator's response score meets a minimum threshold.
//
// The `getValidationStatus` function returns:
//   (address validatorAddress, uint256 agentId, uint8 response,
//    bytes32 responseHash, string tag, uint256 lastUpdate)
//
// In the ABI-encoded return data:
//   slot 0 (0x00): validatorAddress
//   slot 1 (0x20): agentId
//   slot 2 (0x40): response (uint8, the validation score 0-100)
//   slot 3 (0x60): responseHash
//   slot 4 (0x80): offset to tag (dynamic string)
//   slot 5 (0xa0): lastUpdate
//
// We extract `response` from slot 2 and compare against `minResponse`.
// A response of 0 means failed, 100 means passed, with intermediate values
// for spectrum outcomes.
//
// ### Parameters
//
// - registry: The ERC-8004 Validation Registry address.
// - requestHash: The keccak256 hash identifying the validation request.
// - minResponse: The minimum acceptable validation response (0-100).
//
// ### Returns
//
// - success: True if the validation response >= minResponse.
//
// ### Procedures
//
// 01. Load the free memory pointer.
// 02. Store the `getValidationStatusSelector`.
// 03. Store the `requestHash`.
// 04. Call the `registry` with staticcall (read-only).
// 05. If the call failed, return false.
// 06. Load the response from return data slot 2 (offset 0x40).
// 07. Compare response >= minResponse and return the result.
function checkValidation(
    AgentValidation registry,
    bytes32 requestHash,
    uint8 minResponse
) view returns (bool success) {
    assembly ("memory-safe") {
        let fmp := mload(0x40)

        mstore(add(fmp, 0x00), getValidationStatusSelector)

        mstore(add(fmp, 0x04), requestHash)

        // Return buffer needs at least 6 slots (0xc0 bytes) for the head
        success := staticcall(gas(), registry, fmp, 0x24, fmp, 0xc0)

        if success {
            // response is at slot 2 (offset 0x40) in the return data
            let response := mload(add(fmp, 0x40))
            success := iszero(lt(response, minResponse))
        }
    }
}
