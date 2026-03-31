// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title PolicyEngineMock
 * @notice Minimal PolicyEngine for testnet that allows all operations.
 *         For production, use the audited Chainlink PolicyEngine (ERC1967Proxy).
 */
contract PolicyEngineMock {
    address public owner;
    bool public defaultAllow;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(bool _defaultAllow, address _owner) {
        defaultAllow = _defaultAllow;
        owner = _owner;
    }

    /// @notice Check if an operation is allowed. Always returns defaultAllow for testnet.
    function check(
        address, /* from */
        address, /* to */
        address, /* token */
        uint256  /* amount */
    ) external view returns (bool) {
        return defaultAllow;
    }

    function setDefaultAllow(bool _allow) external onlyOwner {
        defaultAllow = _allow;
    }
}
