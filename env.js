const Web3 = require("web3");
// create an instance of web3 using the HTTP provider.
// NOTE in mist web3 is already available, so check first if its available before instantiating
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const BigNumber = require("bignumber.js");

const eth = web3.eth;
const async = require("async");

const MultiSigWallet = require("./dist/multisigwallet.js");

const gcb = (err, res) => {
    if (err) {
        console.log("ERROR: " + err);
    } else {
        console.log(JSON.stringify(res, null, 2));
    }
};

let multiSigWallet;

function deployExample(_cb) {
    const cb = _cb || gcb;
    async.series([
        (cb1) => {
            MultiSigWallet.deploy(
                web3,
                {
                    owners: [
                        eth.accounts[ 0 ],
                        eth.accounts[ 1 ],
                        eth.accounts[ 2 ],
                    ],
                    required: 2,
                },
                (err, _multiSigWallet) => {
                    if (err) {
                        cb1(err);
                        return;
                    }
                    multiSigWallet = _multiSigWallet;
                    console.log("MultiSig Directory: " + multiSigWallet.contract.address);
                    cb1();
                });
        },
        (cb1) => {
            multiSigWallet.submitTransaction({
                from: eth.accounts[ 0 ],
                destination: multiSigWallet.contract.address,
                value: 0,
                data: multiSigWallet.contract.addOwner.getData(eth.accounts[ 3 ]),
            }, cb1);
        },
        (cb1) => {
            const actionOptions = [];
            multiSigWallet.addActionOptions(
                actionOptions,
                multiSigWallet.contract.address,
                0,
                multiSigWallet.contract.addOwner.getData(eth.accounts[ 3 ]),
                () => {
                    console.log(JSON.stringify(actionOptions, null, 2));
                    cb1();
                });
        },
    ], cb);
}

deployExample(() => {
    process.exit();
});
