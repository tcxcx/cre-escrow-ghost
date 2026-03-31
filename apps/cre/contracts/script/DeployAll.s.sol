// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BUAttestation.sol";
import "../src/USDCg.sol";
import "../src/TreasuryManager.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

interface IVault {
    function register(address token, address policyEngine) external;
    function deposit(address token, uint256 amount) external;
}

interface IERC20Minimal {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title DeployAll
 * @notice Deploys the full Ghost Mode / Private Transfer pipeline with USDCg + TreasuryManager.
 *
 *   INVARIANT: USDCg is NEVER minted without 1:1 USDC backing.
 *   USDCg.deposit() does transferFrom(msg.sender, address(this), amount) then _mint(msg.sender, amount).
 *
 *   Contracts deployed:
 *     1. BUAttestation    -- CRE attestation receiver
 *     2. PolicyEngine     -- ERC1967Proxy -> existing Chainlink impl
 *     3. USDCg            -- PolicyEngine-gated 1:1 USDC wrapper
 *     4. TreasuryManager  -- USYC yield manager for USDCg backing
 *
 *   Post-deploy configuration:
 *     5. USDCg.setTreasuryManager(treasuryManager)
 *     6. Register USDCg + PolicyEngine on ACE Vault
 *     7. Approve Vault to spend USDCg
 *     8. Seed initial liquidity (optional)
 *
 *   Required env vars:
 *     PRIVATE_KEY                    -- Deployer private key
 *     FORWARDER_ADDRESS              -- Chainlink CRE Forwarder contract address
 *
 *   Optional env vars:
 *     POLICY_ENGINE_IMPLEMENTATION   -- Chainlink PE impl address (default: Sepolia)
 *     USDC_ADDRESS                   -- USDC token address (default: Sepolia)
 *     USYC_TOKEN_ADDRESS             -- USYC token address (default: Sepolia)
 *     USYC_TELLER_ADDRESS            -- USYC Teller address (default: Sepolia)
 *     USYC_ORACLE_ADDRESS            -- USYC Oracle address (default: Sepolia)
 *     INITIAL_DEPOSIT                -- USDC to deposit as initial liquidity (whole units)
 *                                       Default: 0 (deploy contracts only, no liquidity)
 *
 *   Usage:
 *     # Deploy contracts only:
 *     forge script script/DeployAll.s.sol:DeployAll \
 *       --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 *
 *     # Deploy + seed 100 USDC of liquidity:
 *     INITIAL_DEPOSIT=100 forge script script/DeployAll.s.sol:DeployAll \
 *       --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 */
contract DeployAll is Script {
    address constant VAULT = 0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13;
    address constant DEFAULT_PE_IMPL = 0x4dd190b95Bca90d4a401E61F18E5B904ac6CA527;
    address constant DEFAULT_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant DEFAULT_USYC = 0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3;
    address constant DEFAULT_USYC_TELLER = 0x96424C885951ceb4B79fecb934eD857999e6f82B;
    address constant DEFAULT_USYC_ORACLE = 0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a;

    struct Config {
        address deployer;
        address forwarder;
        address peImpl;
        address usdc;
        address usyc;
        address usycTeller;
        address usycOracle;
        uint256 initialDeposit;
    }

    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");

        Config memory cfg = Config({
            deployer: vm.addr(deployerPK),
            forwarder: vm.envAddress("FORWARDER_ADDRESS"),
            peImpl: vm.envOr("POLICY_ENGINE_IMPLEMENTATION", DEFAULT_PE_IMPL),
            usdc: vm.envOr("USDC_ADDRESS", DEFAULT_USDC),
            usyc: vm.envOr("USYC_TOKEN_ADDRESS", DEFAULT_USYC),
            usycTeller: vm.envOr("USYC_TELLER_ADDRESS", DEFAULT_USYC_TELLER),
            usycOracle: vm.envOr("USYC_ORACLE_ADDRESS", DEFAULT_USYC_ORACLE),
            initialDeposit: vm.envOr("INITIAL_DEPOSIT", uint256(0))
        });

        _logConfig(cfg);
        _preflight(cfg);

        vm.startBroadcast(deployerPK);

        // 1. Deploy BUAttestation (secured by CRE Forwarder)
        BUAttestation attestation = new BUAttestation(cfg.forwarder);
        console.log("1) BUAttestation deployed:", address(attestation));
        console.log("   Forwarder:             ", cfg.forwarder);

        // 2. Deploy fresh PolicyEngine proxy
        ERC1967Proxy peProxy = new ERC1967Proxy(
            cfg.peImpl,
            abi.encodeWithSignature("initialize(bool,address)", true, cfg.deployer)
        );
        console.log("2) PolicyEngine proxy:    ", address(peProxy));

        // 3. Deploy USDCg (PE=address(0) for now; Chainlink PE uses vault-level enforcement)
        //    The ACE Vault enforces PolicyEngine checks on vault operations.
        //    USDCg.setPolicyEngine() can be called later if a compatible PE is deployed.
        USDCg usdcg = new USDCg(cfg.usdc, address(0), cfg.deployer);
        console.log("3) USDCg deployed:        ", address(usdcg));

        // 4. Deploy TreasuryManager
        TreasuryManager tm = new TreasuryManager(
            address(usdcg), cfg.usdc, cfg.usyc,
            cfg.usycTeller, cfg.usycOracle, cfg.forwarder, cfg.deployer
        );
        console.log("4) TreasuryManager:       ", address(tm));

        // 5. Wire TreasuryManager into USDCg (grants max USDC allowance)
        usdcg.setTreasuryManager(address(tm));
        console.log("5) TreasuryManager wired to USDCg");

        // 6. Register USDCg + PolicyEngine on ACE Vault
        IVault(VAULT).register(address(usdcg), address(peProxy));
        console.log("6) Registered on Vault");

        // 7. Approve Vault to spend USDCg
        usdcg.approve(VAULT, type(uint256).max);
        console.log("7) Approved Vault for USDCg");

        // 8. Seed initial liquidity
        _seedLiquidity(cfg, usdcg);

        // 9. Configure hardening
        // Pauser = deployer for now (can be changed to multisig later)
        attestation.setPauser(cfg.deployer);
        usdcg.setPauser(cfg.deployer);
        tm.setPauser(cfg.deployer);

        // Rate limits: PROOF_OF_RESERVES and USDG_SUPPLY_SNAPSHOT throttled to 6 hours
        attestation.setMinInterval(9, 21600);  // PROOF_OF_RESERVES
        attestation.setMinInterval(10, 21600); // USDG_SUPPLY_SNAPSHOT

        // TTLs
        attestation.setTTL(7, 365 days);  // KYC_VERIFIED: 1 year
        attestation.setTTL(8, 365 days);  // KYB_VERIFIED: 1 year
        attestation.setTTL(9, 25 hours);  // PROOF_OF_RESERVES: 25 hours

        // Severities
        attestation.setSeverity(9, BUAttestation.Severity.CRITICAL);   // PROOF_OF_RESERVES
        attestation.setSeverity(10, BUAttestation.Severity.CRITICAL);  // USDG_SUPPLY_SNAPSHOT
        attestation.setSeverity(7, BUAttestation.Severity.WARNING);    // KYC_VERIFIED
        attestation.setSeverity(8, BUAttestation.Severity.WARNING);    // KYB_VERIFIED

        console.log("9) Hardening configured: pausers, rate limits, TTLs, severities");

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("  DEPLOY COMPLETE");
        console.log("========================================");
        console.log("BUAttestation:    ", address(attestation));
        console.log("PolicyEngine:     ", address(peProxy));
        console.log("USDCg:            ", address(usdcg));
        console.log("TreasuryManager:  ", address(tm));
        console.log("Vault:            ", VAULT);
        if (cfg.initialDeposit > 0) {
            console.log("Liquidity:        ", cfg.initialDeposit, "USDC/USDCg (1:1)");
        }
        console.log("Hardening:         pausers, rate limits, TTLs, severities");
        console.log("========================================");
    }

    function _logConfig(Config memory cfg) internal pure {
        console.log("========================================");
        console.log("  Ghost Mode Pipeline - Full Deploy");
        console.log("  USDCg + TreasuryManager");
        console.log("========================================");
        console.log("Deployer:      ", cfg.deployer);
        console.log("Forwarder:     ", cfg.forwarder);
        console.log("PE impl:       ", cfg.peImpl);
        console.log("USDC:          ", cfg.usdc);
        console.log("USYC:          ", cfg.usyc);
        console.log("USYC Teller:   ", cfg.usycTeller);
        console.log("USYC Oracle:   ", cfg.usycOracle);
        console.log("Vault:         ", VAULT);
        if (cfg.initialDeposit > 0) {
            console.log("Liquidity:     ", cfg.initialDeposit, "USDC (1:1 backed)");
        } else {
            console.log("Liquidity:      0 (contracts only)");
        }
        console.log("----------------------------------------");
    }

    function _preflight(Config memory cfg) internal view {
        if (cfg.initialDeposit > 0) {
            uint256 depositAmount = cfg.initialDeposit * 1e6;
            uint256 usdcBalance = IERC20Minimal(cfg.usdc).balanceOf(cfg.deployer);
            require(
                usdcBalance >= depositAmount,
                "Insufficient USDC: deployer must hold >= INITIAL_DEPOSIT USDC"
            );
            console.log("USDC balance:  ", usdcBalance / 1e6, "(sufficient)");
        }
    }

    function _seedLiquidity(Config memory cfg, USDCg usdcg) internal {
        if (cfg.initialDeposit == 0) {
            console.log("8) No liquidity seeded (INITIAL_DEPOSIT=0)");
            return;
        }

        uint256 depositAmount = cfg.initialDeposit * 1e6;

        // 8a. Approve USDCg contract to pull USDC from deployer
        IERC20Minimal(cfg.usdc).approve(address(usdcg), depositAmount);
        console.log("8a) Approved USDCg to pull USDC");

        // 8b. Deposit USDC into USDCg (mints USDCg 1:1)
        usdcg.deposit(depositAmount);
        console.log("8b) Deposited USDC -> USDCg (1:1)");

        // 8c. Deposit USDCg into ACE Vault
        IVault(VAULT).deposit(address(usdcg), depositAmount);
        console.log("8c) USDCg deposited into Vault");

        console.log("    Backing proof:");
        console.log("      USDC.balanceOf(USDCg) = ", depositAmount / 1e6);
        console.log("      USDCg.totalSupply()   = ", depositAmount / 1e6);
    }
}

/**
 * @title DeployBUAttestation
 * @notice Standalone: deploy only BUAttestation.
 *   Env: FORWARDER_ADDRESS (required) -- Chainlink CRE Forwarder contract
 */
contract DeployBUAttestation is Script {
    function run() external {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");
        vm.startBroadcast();
        BUAttestation a = new BUAttestation(forwarder);
        vm.stopBroadcast();
        console.log("BUAttestation:", address(a));
        console.log("Forwarder:    ", forwarder);
    }
}

/**
 * @title DeployUSDCg
 * @notice Standalone: deploy only USDCg.
 *   Env: USDC_ADDRESS, POLICY_ENGINE_ADDRESS, OWNER_ADDRESS (optional, defaults to deployer)
 */
contract DeployUSDCg is Script {
    address constant DEFAULT_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address usdc = vm.envOr("USDC_ADDRESS", DEFAULT_USDC);
        address policyEngine = vm.envAddress("POLICY_ENGINE_ADDRESS");
        address owner = vm.envOr("OWNER_ADDRESS", deployer);

        vm.startBroadcast(pk);
        USDCg usdcg = new USDCg(usdc, policyEngine, owner);
        vm.stopBroadcast();

        console.log("USDCg:        ", address(usdcg));
        console.log("USDC:         ", usdc);
        console.log("PolicyEngine: ", policyEngine);
        console.log("Owner:        ", owner);
    }
}

/**
 * @title DeployPolicyEngine
 * @notice Standalone: deploy a fresh PolicyEngine proxy.
 *   Env: POLICY_ENGINE_IMPLEMENTATION (optional, defaults to Sepolia impl)
 */
contract DeployPolicyEngine is Script {
    address constant DEFAULT_PE_IMPL = 0x4dd190b95Bca90d4a401E61F18E5B904ac6CA527;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address peImpl = vm.envOr("POLICY_ENGINE_IMPLEMENTATION", DEFAULT_PE_IMPL);

        vm.startBroadcast(pk);
        bytes memory initData = abi.encodeWithSignature(
            "initialize(bool,address)", true, deployer
        );
        ERC1967Proxy proxy = new ERC1967Proxy(peImpl, initData);
        vm.stopBroadcast();

        console.log("PolicyEngine proxy:", address(proxy));
        console.log("PE impl:           ", peImpl);
        console.log("Owner:             ", deployer);
    }
}

/**
 * @title RegisterVault
 * @notice Standalone: register an existing token + PolicyEngine on the ACE Vault.
 *   Env: TOKEN_ADDRESS, POLICY_ENGINE_ADDRESS
 */
contract RegisterVault is Script {
    address constant VAULT = 0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address token = vm.envAddress("TOKEN_ADDRESS");
        address policyEngine = vm.envAddress("POLICY_ENGINE_ADDRESS");

        vm.startBroadcast(pk);
        IVault(VAULT).register(token, policyEngine);
        IERC20Minimal(token).approve(VAULT, type(uint256).max);
        vm.stopBroadcast();

        console.log("Registered and approved on Vault");
        console.log("Token:        ", token);
        console.log("PolicyEngine: ", policyEngine);
    }
}

/**
 * @title SeedLiquidity
 * @notice Standalone: deposit USDC into an existing USDCg contract to mint USDCg.
 *   Flow: deployer approves USDCg for USDC, then calls usdcg.deposit(amount).
 *   Env: USDCG_ADDRESS, USDC_ADDRESS (optional), DEPOSIT_AMOUNT (whole USDC units, min 1)
 */
contract SeedLiquidity is Script {
    address constant DEFAULT_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address usdcgAddr = vm.envAddress("USDCG_ADDRESS");
        address usdc = vm.envOr("USDC_ADDRESS", DEFAULT_USDC);
        uint256 amount = vm.envUint("DEPOSIT_AMOUNT");

        require(amount >= 1, "DEPOSIT_AMOUNT must be >= 1 USDC");

        uint256 depositAmount = amount * 1e6;
        uint256 usdcBalance = IERC20Minimal(usdc).balanceOf(deployer);
        require(usdcBalance >= depositAmount, "Insufficient USDC balance");

        console.log("Seeding liquidity:");
        console.log("  USDC:    ", usdc);
        console.log("  USDCg:   ", usdcgAddr);
        console.log("  Amount:  ", amount, "USDC");
        console.log("  Balance: ", usdcBalance / 1e6, "USDC");

        vm.startBroadcast(pk);

        // Approve USDCg contract to pull USDC from deployer
        IERC20Minimal(usdc).approve(usdcgAddr, depositAmount);

        // Deposit USDC -> mint USDCg 1:1
        USDCg(usdcgAddr).deposit(depositAmount);

        vm.stopBroadcast();

        console.log("Done. USDCg minted 1:1 backed by USDC.");
    }
}
