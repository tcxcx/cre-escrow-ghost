// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDg (ghostUSD)
 * @notice 1:1 USDC wrapper for Ghost Mode private transfers.
 * @dev Only Bu treasury (owner) can mint. Anyone can burn their own.
 *      6 decimals to match USDC and USYC.
 *      Registered on Chainlink ACE Vault with PolicyEngine.
 */
contract USDg is ERC20, ERC20Permit, ERC20Burnable, Ownable {
    constructor(address initialOwner)
        ERC20("ghostUSD", "USDg")
        ERC20Permit("ghostUSD")
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
