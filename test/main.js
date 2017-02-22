import ethConnector from "ethconnector";
import assert from "assert"; // node.js core module
import async from "async";
import path from "path";

import MultisigWallet from "../js/multisigwallet";

describe("Normal Scenario Multisig Wallet test", () => {
    let owner1;
    let owner2;
    let owner3;
    let owner4;
    let multisigWallet;

    before((done) => {
        ethConnector.init("testrpc", (err) => {
            if (err) { done(err); return; }
            owner1 = ethConnector.accounts[ 0 ];
            owner2 = ethConnector.accounts[ 1 ];
            owner3 = ethConnector.accounts[ 2 ];
            owner4 = ethConnector.accounts[ 4 ];
            done();
        });
    });
    it("should compile contracts", (done) => {
        ethConnector.compile(
            path.join(__dirname, "../contracts/MultisigWallet.sol"),
            path.join(__dirname, "../contracts/MultisigWallet.sol.js"),
            done,
        );
    }).timeout(20000);
    it("should deploy all the contracts ", (done) => {
        MultisigWallet.deploy(ethConnector.web3, {
            owners: [ owner1, owner2, owner3 ],
            required: 2,
        }, (err, _multisigWallet) => {
            assert.ifError(err);
            assert.ok(_multisigWallet.contract.address);
            multisigWallet = _multisigWallet;
            done();
        });
    }).timeout(20000);
    it("Should start a transaction",
        () => multisigWallet.submitTransaction({
            from: owner1,
            destination: multisigWallet.contract.address,
            value: 0,
            data: multisigWallet.contract.addOwner.getData(owner4),
        }).then(() => multisigWallet.getState())
        .then((st) => {
            assert(st.transactions.length, 1);
            console.log(JSON.stringify(st, null, 2));
        }));
    it("Should add action options", () => {
        const actionOptions = [];
        return multisigWallet.addActionOptions(
            actionOptions,
            multisigWallet.contract.address,
            0,
            multisigWallet.contract.addOwner.getData(owner4))
        .then(() => {
            console.log(JSON.stringify(actionOptions, null, 2));
        });
    }).timeout(6000000);

    function bcDelay(secs, cb) {
        send("evm_increaseTime", [ secs ], (err) => {
            if (err) { cb(err); return; }

      // Mine a block so new time is recorded.
            send("evm_mine", (err1) => {
                if (err1) { cb(err); return; }
                cb();
            });
        });
    }

        // CALL a low level rpc
    function send(method, _params, _callback) {
        let params;
        let callback;
        if (typeof _params === "function") {
            callback = _params;
            params = [];
        } else {
            params = _params;
            callback = _callback;
        }

        ethConnector.web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method,
            params: params || [],
            id: new Date().getTime(),
        }, callback);
    }
});
