// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPolicyEngine {
    function checkTransfer(address token, address from, address to, uint256 amount) external view returns (bool);
}

interface ITreasuryManager {
    function allocateFromDeposit(uint256 usdcAmount) external;
}

/**
 * @title USDCg (Private USDC)
 * @notice PolicyEngine-gated 1:1 USDC wrapper for private transfers.
 * @dev Hardened with Ownable2Step, Pausable, and mint-side backing invariant.
 *      The allocatedToYield counter tracks USDC moved to TreasuryManager for
 *      USYC yield, so the invariant accounts for yield allocation.
 */
contract USDCg is ERC20, ERC20Permit, ERC20Burnable, Ownable2Step, Pausable {
    IERC20 public immutable usdc;
    IPolicyEngine public policyEngine;
    address public treasuryManager;

    uint256 public allocatedToYield;
    address public pauser;

    event Deposit(address indexed account, uint256 amount);
    event Withdraw(address indexed account, uint256 amount);
    event TreasuryManagerSet(address indexed manager);
    event PolicyEngineSet(address indexed engine);
    event PauserUpdated(address indexed previousPauser, address indexed newPauser);
    event YieldAllocationRecorded(uint256 amount, uint256 totalAllocated);
    event YieldRedemptionRecorded(uint256 amount, uint256 totalAllocated);

    error NotCompliant(address account);
    error InsufficientUSDC(uint256 requested, uint256 available);
    error OnlyTreasuryManager();
    error NotPauser();
    error BackingInvariantViolated(uint256 usdcBalance, uint256 totalSupply, uint256 allocated);

    constructor(address _usdc, address _policyEngine, address _owner)
        ERC20("Private USDC", "USDCg")
        ERC20Permit("Private USDC")
        Ownable(_owner)
    {
        usdc = IERC20(_usdc);
        if (_policyEngine != address(0)) {
            policyEngine = IPolicyEngine(_policyEngine);
        }
    }

    function deposit(uint256 amount) external whenNotPaused {
        _checkCompliance(msg.sender);
        usdc.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);

        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance < totalSupply() - allocatedToYield) {
            revert BackingInvariantViolated(usdcBalance, totalSupply(), allocatedToYield);
        }

        emit Deposit(msg.sender, amount);

        // Auto-allocate deposited USDC to USYC yield via TreasuryManager
        if (treasuryManager != address(0)) {
            ITreasuryManager(treasuryManager).allocateFromDeposit(amount);
        }
    }

    function withdraw(uint256 amount) external whenNotPaused {
        _checkCompliance(msg.sender);
        uint256 available = usdc.balanceOf(address(this));
        if (available < amount) {
            revert InsufficientUSDC(amount, available);
        }
        _burn(msg.sender, amount);
        usdc.transfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function recordYieldAllocation(uint256 amount) external {
        if (msg.sender != treasuryManager) revert OnlyTreasuryManager();
        allocatedToYield += amount;
        emit YieldAllocationRecorded(amount, allocatedToYield);
    }

    function recordYieldRedemption(uint256 amount) external {
        if (msg.sender != treasuryManager) revert OnlyTreasuryManager();
        allocatedToYield -= amount;
        emit YieldRedemptionRecorded(amount, allocatedToYield);
    }

    function setTreasuryManager(address _manager) external onlyOwner {
        if (treasuryManager != address(0)) {
            usdc.approve(treasuryManager, 0);
        }
        treasuryManager = _manager;
        usdc.approve(_manager, type(uint256).max);
        emit TreasuryManagerSet(_manager);
    }

    function setPolicyEngine(address _engine) external onlyOwner {
        policyEngine = IPolicyEngine(_engine);
        emit PolicyEngineSet(_engine);
    }

    function setPauser(address _pauser) external onlyOwner {
        address prev = pauser;
        pauser = _pauser;
        emit PauserUpdated(prev, _pauser);
    }

    function pause() external {
        if (msg.sender != pauser && msg.sender != owner()) {
            revert NotPauser();
        }
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function _checkCompliance(address account) internal view {
        if (address(policyEngine) != address(0)) {
            bool allowed = policyEngine.checkTransfer(address(this), account, account, 0);
            if (!allowed) {
                revert NotCompliant(account);
            }
        }
    }
}
