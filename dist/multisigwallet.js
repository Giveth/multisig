"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _async = require("async");

var _async2 = _interopRequireDefault(_async);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _runethtx = require("runethtx");

var _MultiSigWalletSol = require("../contracts/MultiSigWallet.sol.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MultiSigWallet = function () {
    function MultiSigWallet(web3, address) {
        _classCallCheck(this, MultiSigWallet);

        this.web3 = web3;
        this.contract = this.web3.eth.contract(_MultiSigWalletSol.MultiSigWalletAbi).at(address);
    }

    _createClass(MultiSigWallet, [{
        key: "getState",
        value: function getState(_cb) {
            var _this = this;

            return (0, _runethtx.asyncfunc)(function (cb) {
                var st = {};
                var nTransactions = void 0;
                _async2.default.series([function (cb1) {
                    _this.contract.required(function (err, _required) {
                        if (err) {
                            cb(err);return;
                        }
                        st.required = _required.toNumber();
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.getOwners(function (err, _owners) {
                        if (err) {
                            cb(err);return;
                        }
                        st.owners = _owners;
                        cb1();
                    });
                }, function (cb1) {
                    _this.web3.eth.getBalance(_this.contract.address, function (err, _balance) {
                        if (err) {
                            cb(err);return;
                        }
                        st.balance = _balance;
                        cb1();
                    });
                }, function (cb1) {
                    _this.contract.getTransactionCount(true, true, function (err, res) {
                        if (err) {
                            cb(err);return;
                        }
                        nTransactions = res.toNumber();
                        st.transactions = [];
                        cb1();
                    });
                }, function (cb1) {
                    _async2.default.eachSeries(_lodash2.default.range(0, nTransactions), function (idTransaction, cb2) {
                        var transaction = void 0;
                        _async2.default.series([function (cb3) {
                            _this.contract.transactions(idTransaction, function (err, res) {
                                if (err) {
                                    cb(err);return;
                                }
                                transaction = {
                                    destination: res[0],
                                    value: res[1],
                                    data: res[2],
                                    executed: res[3]
                                };
                                st.transactions.push(transaction);
                                cb3();
                            });
                        }, function (cb3) {
                            _this.contract.getConfirmations(idTransaction, function (err, res) {
                                if (err) {
                                    cb(err);return;
                                }
                                transaction.confirmations = res;
                                cb3();
                            });
                        }], cb2);
                    }, cb1);
                }], function (err) {
                    if (err) {
                        cb(err);return;
                    }
                    cb(null, st);
                });
            }, _cb);
        }
    }, {
        key: "submitTransaction",
        value: function submitTransaction(opts, cb) {
            return (0, _runethtx.sendContractTx)(this.web3, this.contract, "submitTransaction", opts, cb);
        }
    }, {
        key: "confirmTransaction",
        value: function confirmTransaction(opts, cb) {
            return (0, _runethtx.sendContractTx)(this.web3, this.contract, "confirmTransaction", opts, cb);
        }
    }, {
        key: "revokeConfirmation",
        value: function revokeConfirmation(opts, cb) {
            return (0, _runethtx.sendContractTx)(this.web3, this.contract, "revokeConfirmation", opts, cb);
        }
    }, {
        key: "addActionOptions",
        value: function addActionOptions(actionOptions, dest, value, data, _cb) {
            var _this2 = this;

            return (0, _runethtx.asyncfunc)(function (cb) {
                var accounts = void 0;
                var st = void 0;
                _async2.default.series([function (cb1) {
                    _this2.web3.eth.getAccounts(function (err, _accounts) {
                        if (err) {
                            cb1(err);
                            return;
                        }
                        accounts = _accounts;
                        cb1();
                    });
                }, function (cb1) {
                    _this2.getState(function (err, _st) {
                        if (err) {
                            cb1(err);
                            return;
                        }
                        st = _st;
                        cb1();
                    });
                }, function (cb1) {
                    _lodash2.default.each(_lodash2.default.intersection(accounts, st.owners), function (account) {
                        actionOptions.push({
                            type: "MULTISIG_START",
                            multisig: _this2.contract.address,
                            account: account
                        });
                    });
                    _lodash2.default.each(st.transactions, function (transaction) {
                        if (transaction.executed === false && transaction.destination === dest && transaction.data === data) {
                            actionOptions.push({
                                type: "MULTISIG_INFO",
                                multisig: _this2.contract.address,
                                confirmations: transaction.confirmations
                            });
                        }
                        _lodash2.default.each(_lodash2.default.intersection(accounts, st.owners), function (account) {
                            if (transaction.confirmations.indexOf(account) >= 0) {
                                actionOptions.push({
                                    type: "MULTISIG_REVOKE",
                                    account: account,
                                    multisig: _this2.contract.address,
                                    transaction: transaction
                                });
                            } else {
                                actionOptions.push({
                                    type: "MULTISIG_CONFIRM",
                                    account: account,
                                    multisig: _this2.contract.address,
                                    transaction: transaction
                                });
                            }
                        });
                    });
                    cb1();
                }], cb);
            }, _cb);
        }
    }], [{
        key: "deploy",
        value: function deploy(web3, opts, _cb) {
            return (0, _runethtx.asyncfunc)(function (cb) {
                var params = Object.assign({}, opts);
                params.abi = _MultiSigWalletSol.MultiSigWalletAbi;
                params.byteCode = _MultiSigWalletSol.MultiSigWalletByteCode;
                return (0, _runethtx.deploy)(web3, params, function (err, _multiSigWallet) {
                    if (err) {
                        cb(err);
                        return;
                    }
                    var multiSigWallet = new MultiSigWallet(web3, _multiSigWallet.address);
                    cb(null, multiSigWallet);
                });
            }, _cb);
        }
    }]);

    return MultiSigWallet;
}();

exports.default = MultiSigWallet;
module.exports = exports["default"];
