// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title BUAttestationMock
 * @notice Minimal BUAttestation mock for testnet deployments.
 *         Stores attestations and emits events, but has no rate limits or TTL.
 *         For production, use the hardened BUAttestation with Pausable, rate limits, severity.
 */
contract BUAttestationMock {
    address public owner;

    struct Attestation {
        bytes32 reportHash;
        uint8 severity;
        uint256 timestamp;
        address reporter;
    }

    mapping(bytes32 => Attestation) public attestations;

    event AttestationReceived(bytes32 indexed reportHash, uint8 severity, address reporter);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function attest(bytes32 _reportHash, uint8 _severity) external {
        attestations[_reportHash] = Attestation({
            reportHash: _reportHash,
            severity: _severity,
            timestamp: block.timestamp,
            reporter: msg.sender
        });
        emit AttestationReceived(_reportHash, _severity, msg.sender);
    }

    function getAttestation(bytes32 _reportHash) external view returns (Attestation memory) {
        return attestations[_reportHash];
    }
}
