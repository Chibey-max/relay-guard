// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RelayPolicy} from "../src/RelayPolicy.sol";

contract RelayPolicyTest is Test {
    RelayPolicy policy;
    address owner = address(this);
    address agent = address(0xA6E17);
    address recipient = address(0xBEEF);

    function setUp() public {
        policy = new RelayPolicy(agent, 100 ether, 500 ether);
    }

    function test_autoEnrollsFirstTimeRecipientUnderDefaults() public {
        vm.prank(agent);
        policy.checkAndRecord(recipient, 5 ether);

        RelayPolicy.Limit memory l = policy.getLimit(recipient);
        assertTrue(l.whitelisted);
        assertEq(l.perTxMaxWei, 100 ether);
        assertEq(l.dailyMaxWei, 500 ether);
        assertEq(l.spentToday, 5 ether);
    }

    function test_rejectsOverPerTxDefault() public {
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(RelayPolicy.OverPerTxLimit.selector, recipient, 200 ether, 100 ether)
        );
        policy.checkAndRecord(recipient, 200 ether);
    }

    function test_rejectsOverDailyAcrossMultipleTx() public {
        vm.startPrank(agent);
        policy.checkAndRecord(recipient, 100 ether); // 100
        policy.checkAndRecord(recipient, 100 ether); // 200
        policy.checkAndRecord(recipient, 100 ether); // 300
        policy.checkAndRecord(recipient, 100 ether); // 400
        policy.checkAndRecord(recipient, 100 ether); // 500 — exactly at daily cap, OK
        vm.expectRevert(
            abi.encodeWithSelector(RelayPolicy.OverDailyLimit.selector, recipient, 600 ether, 500 ether)
        );
        policy.checkAndRecord(recipient, 100 ether); // 600 — over
        vm.stopPrank();
    }

    function test_dailyWindowRolls() public {
        vm.startPrank(agent);
        for (uint256 i = 0; i < 5; i++) {
            policy.checkAndRecord(recipient, 100 ether); // 5x100 = hits daily cap
        }
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(agent);
        policy.checkAndRecord(recipient, 100 ether); // new window, should succeed
    }

    function test_noDefaultsMeansUnconfiguredRecipientRejected() public {
        RelayPolicy strict = new RelayPolicy(agent, 0, 0);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(RelayPolicy.NotWhitelisted.selector, recipient));
        strict.checkAndRecord(recipient, 1 ether);
    }

    function test_explicitConfigOverridesDefault() public {
        policy.configureRecipient(recipient, 10 ether, 20 ether);
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(RelayPolicy.OverPerTxLimit.selector, recipient, 50 ether, 10 ether)
        );
        policy.checkAndRecord(recipient, 50 ether);
    }

    function test_onlyAgentCanCheck() public {
        vm.expectRevert(RelayPolicy.NotAgent.selector);
        policy.checkAndRecord(recipient, 1 ether);
    }

    function test_pausedBlocksSpend() public {
        policy.setPaused(true);
        vm.prank(agent);
        vm.expectRevert(RelayPolicy.IsPaused.selector);
        policy.checkAndRecord(recipient, 1 ether);
    }

    function test_onlyOwnerCanSetDefaults() public {
        vm.prank(agent);
        vm.expectRevert(RelayPolicy.NotOwner.selector);
        policy.setDefaultLimits(1 ether, 2 ether);
    }
}
