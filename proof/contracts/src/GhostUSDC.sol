// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {FHERC20Wrapper} from "./fherc20/FHERC20Wrapper.sol";
import {euint64, InEuint64, FHE} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title IPolicyEngine
 * @notice Minimal interface for Chainlink ACE PolicyEngine compliance checks.
 */
interface IPolicyEngine {
    function checkTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external view returns (bool);
}

/**
 * @title GhostUSDC (eUSDCg)
 * @notice FHE-encrypted USDCg wrapper with ACE compliance enforcement.
 *
 * Layer 4 of the Bu privacy stack:
 *   L1: TreasuryManager + USYC (yield)
 *   L2: USDCg + PolicyEngine (compliance)
 *   L3: ACE Vault + DON State (private ledger)
 *   L4: GhostUSDC (FHE encrypted balances) — this contract
 *
 * Built on the Fhenix FHERC20Wrapper reference implementation.
 * All FHE operations happen on-chain via CoFHE TaskManager.
 *
 * Server-side orchestration:
 *   Circle DCW calls wrap/unwrap/transferAmount with plaintext amounts.
 *   The contract encrypts internally via FHE.asEuint64().
 *   No SDK needed on the server.
 */
contract GhostUSDC is FHERC20Wrapper, Pausable {
    using SafeERC20 for IERC20;

    /// @notice CRE forwarder address — authorized to wrap/unwrap on behalf of users
    address public creForwarder;

    /// @notice ACE PolicyEngine for compliance checks on every transfer
    IPolicyEngine public policyEngine;

    event CreForwarderSet(address indexed forwarder);
    event PolicyEngineSet(address indexed engine);

    error OnlyCreForwarder();
    error ZeroAddress();
    error TransferDeniedByPolicy(address from, address to);
    error OnlyClaimant();

    constructor(IERC20 _underlying, address _owner, address _policyEngine)
        FHERC20Wrapper(_underlying, "eUSDCg")
    {
        // FHERC20Wrapper sets Ownable(msg.sender), transfer to intended owner
        _transferOwnership(_owner);
        policyEngine = IPolicyEngine(_policyEngine);
    }

    // ========================================================================
    // Compliance-enforced confidential transfers (overrides FHERC20)
    // ========================================================================

    /// @notice Transfer encrypted amount — PolicyEngine gate enforced
    function confidentialTransfer(address to, InEuint64 memory inValue)
        public
        override
        whenNotPaused
        returns (euint64 transferred)
    {
        _requireCompliant(msg.sender, to);
        return super.confidentialTransfer(to, inValue);
    }

    /// @notice Transfer with euint64 handle — PolicyEngine gate enforced
    function confidentialTransfer(address to, euint64 value)
        public
        override
        whenNotPaused
        returns (euint64 transferred)
    {
        _requireCompliant(msg.sender, to);
        return super.confidentialTransfer(to, value);
    }

    // ========================================================================
    // Server-friendly operations (plaintext amounts — contract encrypts)
    // ========================================================================

    /// @notice Transfer plaintext amount — encrypts internally, PolicyEngine enforced
    /// @dev For server-side orchestration via Circle DCW. No SDK needed.
    function transferAmount(address to, uint64 amount) external whenNotPaused {
        _requireCompliant(msg.sender, to);
        euint64 encAmount = FHE.asEuint64(amount);
        _transfer(msg.sender, to, encAmount);
    }

    /// @notice Wrap with pause protection
    function wrap(address to, uint64 value) public override whenNotPaused {
        super.wrap(to, value);
    }

    /// @notice Unwrap with pause protection
    function unwrap(address to, uint64 value) public override whenNotPaused {
        super.unwrap(to, value);
    }

    /// @notice Claim with pause + caller protection
    function claimUnwrapped(bytes32 ctHash) public override whenNotPaused {
        super.claimUnwrapped(ctHash);
    }

    // ========================================================================
    // CRE-authorized operations
    // ========================================================================

    /// @notice Wrap tokens on behalf of a user (CRE deposit flow)
    function wrapFor(address user, uint64 amount) external whenNotPaused {
        _requireCreForwarder();
        erc20().safeTransferFrom(msg.sender, address(this), amount);
        _mint(user, amount);
    }

    /// @notice Unwrap tokens on behalf of a user (CRE withdrawal flow)
    function unwrapFor(address user, uint64 amount) external whenNotPaused {
        _requireCreForwarder();
        euint64 burned = _burn(user, amount);
        FHE.decrypt(burned);
        _createClaim(user, amount, burned);
    }

    // ========================================================================
    // Admin
    // ========================================================================

    function setCreForwarder(address _forwarder) external onlyOwner {
        if (_forwarder == address(0)) revert ZeroAddress();
        creForwarder = _forwarder;
        emit CreForwarderSet(_forwarder);
    }

    function setPolicyEngine(address _engine) external onlyOwner {
        if (_engine == address(0)) revert ZeroAddress();
        policyEngine = IPolicyEngine(_engine);
        emit PolicyEngineSet(_engine);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ========================================================================
    // Internal
    // ========================================================================

    function _requireCreForwarder() internal view {
        if (msg.sender != creForwarder && msg.sender != owner()) {
            revert OnlyCreForwarder();
        }
    }

    /// @notice Enforce ACE PolicyEngine compliance for both parties
    function _requireCompliant(address from, address to) internal view {
        if (address(policyEngine) == address(0)) return;
        bool allowed = policyEngine.checkTransfer(address(this), from, to, 0);
        if (!allowed) revert TransferDeniedByPolicy(from, to);
    }
}
