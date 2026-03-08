// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReceiverTemplate} from "./cre-receiver/ReceiverTemplate.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSYCTeller {
    function subscribe(uint256 usdcAmount) external returns (uint256 usycAmount);
    function redeem(uint256 usycAmount) external returns (uint256 usdcAmount);
}

interface IUSYCOracle {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}

interface IUSDCg {
    function totalSupply() external view returns (uint256);
    function recordYieldAllocation(uint256 amount) external;
    function recordYieldRedemption(uint256 amount) external;
}

/**
 * @title TreasuryManager
 * @notice Manages USYC yield allocation for USDCg backing.
 * @dev Inherits ReceiverTemplate so CRE workflows can trigger rebalances
 *      directly on-chain via signed reports. Also supports manual
 *      allocateToYield/redeemFromYield as onlyOwner fallback.
 *      Calls USDCg.recordYieldAllocation/recordYieldRedemption to maintain
 *      the backing invariant counter.
 */
contract TreasuryManager is ReceiverTemplate, Pausable {
    IERC20 public immutable usdcg;
    IERC20 public immutable usdc;
    IERC20 public immutable usyc;
    IUSYCTeller public immutable teller;
    IUSYCOracle public immutable oracle;

    uint256 public constant BUFFER_TARGET_BPS = 1500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    enum TreasuryAction {
        ALLOCATE,
        REDEEM
    }

    address public pauser;

    event AllocatedToYield(uint256 usdcAmount, uint256 usycReceived);
    event RedeemedFromYield(uint256 usycAmount, uint256 usdcReceived);
    event PauserUpdated(address indexed previousPauser, address indexed newPauser);

    error InvalidAction(uint8 action);
    error NotPauser();
    error OnlyUSDCg();

    constructor(
        address _usdcg,
        address _usdc,
        address _usyc,
        address _teller,
        address _oracle,
        address _forwarderAddress,
        address _owner
    ) ReceiverTemplate(_forwarderAddress) {
        usdcg = IERC20(_usdcg);
        usdc = IERC20(_usdc);
        usyc = IERC20(_usyc);
        teller = IUSYCTeller(_teller);
        oracle = IUSYCOracle(_oracle);

        IERC20(_usdc).approve(_teller, type(uint256).max);

        _transferOwnership(_owner);
    }

    // ========================================================================
    // CRE Report Processing
    // ========================================================================

    function _processReport(bytes calldata report) internal override whenNotPaused {
        (uint8 action, uint256 amount) = abi.decode(report, (uint8, uint256));

        if (action == uint8(TreasuryAction.ALLOCATE)) {
            _allocateToYield(amount);
        } else if (action == uint8(TreasuryAction.REDEEM)) {
            _redeemFromYield(amount);
        } else {
            revert InvalidAction(action);
        }
    }

    // ========================================================================
    // Manual Admin Functions
    // ========================================================================

    function allocateToYield(uint256 usdcAmount) external onlyOwner whenNotPaused {
        _allocateToYield(usdcAmount);
    }

    /// @notice Called by USDCg.deposit() to auto-allocate deposited USDC to yield.
    function allocateFromDeposit(uint256 usdcAmount) external whenNotPaused {
        if (msg.sender != address(usdcg)) revert OnlyUSDCg();
        _allocateToYield(usdcAmount);
    }

    function redeemFromYield(uint256 usycAmount) external onlyOwner whenNotPaused {
        _redeemFromYield(usycAmount);
    }

    // ========================================================================
    // Internal Logic
    // ========================================================================

    function _allocateToYield(uint256 usdcAmount) internal {
        usdc.transferFrom(address(usdcg), address(this), usdcAmount);
        IUSDCg(address(usdcg)).recordYieldAllocation(usdcAmount);
        uint256 usycReceived = teller.subscribe(usdcAmount);
        emit AllocatedToYield(usdcAmount, usycReceived);
    }

    function _redeemFromYield(uint256 usycAmount) internal {
        usyc.approve(address(teller), usycAmount);
        uint256 usdcReceived = teller.redeem(usycAmount);
        usdc.transfer(address(usdcg), usdcReceived);
        IUSDCg(address(usdcg)).recordYieldRedemption(usdcReceived);
        emit RedeemedFromYield(usycAmount, usdcReceived);
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    function getYieldValueUSDC() external view returns (uint256) {
        uint256 usycBalance = usyc.balanceOf(address(this));
        if (usycBalance == 0) return 0;
        return usycBalance * uint256(oracle.latestAnswer()) / (10 ** oracle.decimals());
    }

    function getBufferRatioBPS() external view returns (uint256) {
        uint256 supply = IUSDCg(address(usdcg)).totalSupply();
        if (supply == 0) return BPS_DENOMINATOR;
        return usdc.balanceOf(address(usdcg)) * BPS_DENOMINATOR / supply;
    }

    function getTotalBacking() external view returns (uint256 usdcBuffer, uint256 yieldValue, uint256 total) {
        usdcBuffer = usdc.balanceOf(address(usdcg));
        uint256 usycBalance = usyc.balanceOf(address(this));
        if (usycBalance > 0) {
            yieldValue = usycBalance * uint256(oracle.latestAnswer()) / (10 ** oracle.decimals());
        }
        total = usdcBuffer + yieldValue;
    }

    // ========================================================================
    // Pause / Unpause
    // ========================================================================

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
}
