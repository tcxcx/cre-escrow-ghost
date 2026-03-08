// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EscrowWithAgentV3} from "./EscrowWithAgentV3.sol";

/**
 * @title EscrowExtractor
 * @notice Decodes CRE report bytes and dispatches to EscrowWithAgentV3.
 *
 * Report encoding:
 *   (uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)
 *
 * Action types:
 *   0 = SET_STATUS         (unused — prefer SET_MILESTONE_STATUS)
 *   1 = APPROVE_MILESTONE  (unused — prefer SET_MILESTONE_STATUS)
 *   2 = LOCK_MILESTONE
 *   3 = SET_DECISION
 *   4 = EXECUTE_DECISION
 *   5 = SET_MILESTONE_STATUS
 */
contract EscrowExtractor {
    uint8 constant ACTION_SET_STATUS = 0;
    uint8 constant ACTION_APPROVE_MILESTONE = 1;
    uint8 constant ACTION_LOCK_MILESTONE = 2;
    uint8 constant ACTION_SET_DECISION = 3;
    uint8 constant ACTION_EXECUTE_DECISION = 4;
    uint8 constant ACTION_SET_MILESTONE_STATUS = 5;

    /**
     * @notice Decode report bytes and dispatch to the escrow contract.
     * @param escrow  Target EscrowWithAgentV3 contract.
     * @param report  ABI-encoded (uint8, uint256, address, uint256, bytes32).
     */
    function extract(address escrow, bytes calldata report) external {
        (
            uint8 actionType,
            uint256 milestoneIndex,
            ,                   // executorAgent — unused in dispatch
            uint256 payeeBps,
            bytes32 receiptHash
        ) = abi.decode(report, (uint8, uint256, address, uint256, bytes32));

        EscrowWithAgentV3 e = EscrowWithAgentV3(escrow);

        if (actionType == ACTION_SET_MILESTONE_STATUS) {
            // payeeBps is repurposed as the new status uint8
            e.setMilestoneStatus(milestoneIndex, uint8(payeeBps));
        } else if (actionType == ACTION_LOCK_MILESTONE) {
            e.lockMilestone(milestoneIndex);
        } else if (actionType == ACTION_SET_DECISION) {
            e.setDecision(milestoneIndex, payeeBps, receiptHash);
        } else if (actionType == ACTION_EXECUTE_DECISION) {
            e.executeDecision(milestoneIndex);
        } else {
            revert("EscrowExtractor: unknown action");
        }
    }
}
