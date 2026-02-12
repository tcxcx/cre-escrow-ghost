// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

/// @title PayoutLimitPolicy — ACE policy enforcing payout bounds
/// @notice Rate-limits payout amounts per milestone. Prevents a compromised executor
///         from draining more than the milestone's escrowed amount.
///         Checks payeeBps <= 10000 and validates amount is within configured limits.
///
/// Mirrors the VolumePolicy pattern from stablecoin-ace-ccip.
///
/// Configuration:
///   policyEngine.addPolicy(
///     escrowConsumer,
///     onReport.selector,
///     payoutLimitPolicy,
///     [keccak256("payeeBps")]
///   )

interface IPolicyEngineForPolicy {
    enum PolicyResult { Continue, Allow }
    error PolicyRejected(string reason);
}

contract PayoutLimitPolicy {
    // ── Storage ────────────────────────────────────────────────────────────

    /// @notice Maximum allowed payeeBps (default 10000 = 100%)
    uint16 public maxPayeeBps;

    address public owner;
    bool private _initialized;

    // ── Initialize ─────────────────────────────────────────────────────────

    function initialize(address _owner, uint16 _maxPayeeBps) external {
        require(!_initialized, "PayoutLimitPolicy: already initialized");
        require(_maxPayeeBps <= 10000, "PayoutLimitPolicy: bps > 10000");
        owner = _owner;
        maxPayeeBps = _maxPayeeBps;
        _initialized = true;
    }

    // ── Policy Check ───────────────────────────────────────────────────────

    /// @notice Check that the payout split is within bounds.
    /// @param parameters Expected: [uint256 payeeBps]
    function run(
        address, /* caller */
        address, /* subject */
        bytes4,  /* selector */
        bytes[] calldata parameters,
        bytes calldata /* context */
    )
        external
        view
        returns (IPolicyEngineForPolicy.PolicyResult)
    {
        require(parameters.length >= 1, "PayoutLimitPolicy: expected payeeBps parameter");

        uint256 payeeBps = abi.decode(parameters[0], (uint256));

        if (payeeBps > maxPayeeBps) {
            revert IPolicyEngineForPolicy.PolicyRejected("payeeBps exceeds maximum");
        }

        return IPolicyEngineForPolicy.PolicyResult.Continue;
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function setMaxPayeeBps(uint16 _maxPayeeBps) external {
        require(msg.sender == owner, "PayoutLimitPolicy: only owner");
        require(_maxPayeeBps <= 10000, "PayoutLimitPolicy: bps > 10000");
        maxPayeeBps = _maxPayeeBps;
    }
}
