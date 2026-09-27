// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RelayPolicy} from "../src/RelayPolicy.sol";

/// @notice Deploy RelayPolicy to Arbitrum Sepolia.
/// Usage:
///   forge script contracts/script/Deploy.s.sol \
///     --rpc-url $ARB_SEPOLIA_RPC --broadcast --verify \
///     --etherscan-api-key $ARBISCAN_KEY
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agent = vm.envAddress("AGENT_ADDRESS");
        // Auto-enrollment bounds for recipients seen for the first time
        // (arbitrary addresses typed in a sentence can't be pre-whitelisted
        // one by one). Defaults to 100 / 500 token-units (18-decimal
        // convention) per recipient if not overridden via env.
        uint256 defaultPerTxMaxWei = vm.envOr("DEFAULT_PER_TX_MAX_WEI", uint256(100 ether));
        uint256 defaultDailyMaxWei = vm.envOr("DEFAULT_DAILY_MAX_WEI", uint256(500 ether));

        vm.startBroadcast(pk);
        RelayPolicy policy = new RelayPolicy(agent, defaultPerTxMaxWei, defaultDailyMaxWei);
        vm.stopBroadcast();

        console.log("RelayPolicy deployed at:", address(policy));
        console.log("Owner (guardian):", policy.owner());
        console.log("Agent:", policy.agent());
        console.log("Default per-tx max (wei):", policy.defaultPerTxMaxWei());
        console.log("Default daily max (wei):", policy.defaultDailyMaxWei());
    }
}
